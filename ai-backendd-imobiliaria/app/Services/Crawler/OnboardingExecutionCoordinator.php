<?php

namespace App\Services\Crawler;

use App\Models\Crawler\CrawlerOperation;
use App\Models\Crawler\DiscoverySnapshot;
use App\Models\Crawler\ExtractionProfile;
use App\Models\Crawler\OnboardingExecution;
use App\Models\Crawler\ProfileValidationReport;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class OnboardingExecutionCoordinator
{
    public function __construct(
        private readonly CrawlerOperationService $operations,
        private readonly ExtractionProfileWorkflowService $profiles,
    ) {}

    public function reconcilePending(): int
    {
        $count = 0;
        OnboardingExecution::query()
            ->whereIn('state', ['queued', 'running'])
            ->orderBy('id')
            ->pluck('id')
            ->each(function (int $executionId) use (&$count): void {
                $this->reconcile($executionId);
                $count++;
            });

        return $count;
    }

    public function reconcile(int|OnboardingExecution $execution): OnboardingExecution
    {
        $executionId = $execution instanceof OnboardingExecution ? $execution->id : $execution;

        return DB::transaction(function () use ($executionId): OnboardingExecution {
            $locked = OnboardingExecution::query()
                ->with(['crawlAgency', 'contract'])
                ->lockForUpdate()
                ->findOrFail($executionId);

            if (! in_array($locked->state, ['queued', 'running'], true)) {
                return $this->loadForRead($locked);
            }

            $operation = $locked->operations()
                ->where('onboarding_step', $locked->current_step)
                ->latest('attempt')
                ->first();

            if ($operation === null) {
                $this->queueCurrentStep($locked);

                return $this->loadForRead($locked->refresh());
            }

            if (in_array($operation->state, ['queued', 'running', 'cancellation_requested'], true)) {
                return $this->loadForRead($locked);
            }

            if (in_array($operation->state, ['failed', 'cancelled'], true)) {
                return $this->requireAttention(
                    $locked,
                    'child_operation_failed',
                    $operation->error_message ?? "The {$operation->type} operation ended as {$operation->state}.",
                );
            }

            return match ($locked->current_step) {
                'discovery' => $this->advanceAfterDiscovery($locked, $operation),
                'profile_generation' => $this->advanceAfterProfileGeneration($locked, $operation),
                'profile_validation' => $this->pauseForApproval($locked, $operation),
                default => $this->loadForRead($locked),
            };
        });
    }

    private function queueCurrentStep(OnboardingExecution $execution): CrawlerOperation
    {
        $requester = User::query()->findOrFail($execution->created_by);
        $configuration = $execution->resolved_configuration;

        $operation = match ($execution->current_step) {
            'discovery' => $this->operations->queueDiscovery(
                $execution->crawlAgency,
                $execution->contract,
                $requester,
                $configuration['discovery_policy'],
                $execution,
                'discovery',
            ),
            'profile_generation' => $this->queueProfileGeneration($execution, $requester),
            'profile_validation' => $this->queueProfileValidation($execution, $requester),
            default => throw new \LogicException("Unsupported onboarding step: {$execution->current_step}"),
        };

        $execution->update([
            'state' => 'running',
            'started_at' => $execution->started_at ?? now(),
            'paused_at' => null,
            'attention_code' => null,
            'attention_message' => null,
        ]);

        return $operation;
    }

    private function queueProfileGeneration(OnboardingExecution $execution, User $requester): CrawlerOperation
    {
        $discoveryOperation = $execution->operations()
            ->where('onboarding_step', 'discovery')
            ->where('state', 'succeeded')
            ->latest('attempt')
            ->firstOrFail();
        $snapshot = DiscoverySnapshot::query()->where('operation_id', $discoveryOperation->id)->firstOrFail();

        return $this->operations->queueProfileGeneration(
            $execution->crawlAgency,
            $snapshot,
            $execution->contract,
            (string) $execution->sample_url,
            $requester,
            $execution->resolved_configuration['extraction_policy'],
            $execution,
            'profile_generation',
        );
    }

    private function queueProfileValidation(OnboardingExecution $execution, User $requester): CrawlerOperation
    {
        $generationOperation = $execution->operations()
            ->where('onboarding_step', 'profile_generation')
            ->where('state', 'succeeded')
            ->latest('attempt')
            ->firstOrFail();
        $profile = ExtractionProfile::query()
            ->where('created_by_operation_id', $generationOperation->id)
            ->firstOrFail();

        return $this->profiles->queueValidation(
            $profile,
            $requester,
            $execution->resolved_configuration['extraction_policy'],
            $execution,
            'profile_validation',
        );
    }

    private function advanceAfterDiscovery(
        OnboardingExecution $execution,
        CrawlerOperation $operation,
    ): OnboardingExecution {
        $snapshot = DiscoverySnapshot::query()->where('operation_id', $operation->id)->first();
        if ($snapshot === null) {
            return $this->requireAttention(
                $execution,
                'discovery_snapshot_missing',
                'Discovery succeeded without a persisted Discovery Snapshot.',
            );
        }

        $sampleUrl = $this->selectSampleUrl($snapshot, $execution->crawlAgency->root_domain);
        if ($sampleUrl === null) {
            return $this->requireAttention(
                $execution,
                'eligible_sample_url_missing',
                'The Discovery Snapshot has no eligible sample URL.',
            );
        }

        $execution->update([
            'discovery_snapshot_id' => $snapshot->id,
            'current_step' => 'profile_generation',
            'sample_url' => $sampleUrl,
            'sample_url_selection' => [
                'method' => 'first_eligible_snapshot_url_by_id',
                'discovery_snapshot_id' => $snapshot->id,
                'url' => $sampleUrl,
                'selected_at' => now()->toIso8601String(),
            ],
        ]);
        if ($execution->conduction === 'manual') {
            $execution->update([
                'state' => 'awaiting_manual_step',
                'current_step' => 'sample_url_confirmation',
                'paused_at' => now(),
                'sample_url_selection' => [
                    ...$execution->sample_url_selection,
                    'confirmed' => false,
                ],
            ]);

            return $this->loadForRead($execution->refresh());
        }

        $execution->refresh()->load(['crawlAgency', 'contract']);
        $this->queueCurrentStep($execution);

        return $this->loadForRead($execution->refresh());
    }

    private function advanceAfterProfileGeneration(
        OnboardingExecution $execution,
        CrawlerOperation $operation,
    ): OnboardingExecution {
        if (! ExtractionProfile::query()->where('created_by_operation_id', $operation->id)->exists()) {
            return $this->requireAttention(
                $execution,
                'extraction_profile_missing',
                'Profile generation succeeded without a persisted Extraction Profile.',
            );
        }

        $execution->update(['current_step' => 'profile_validation']);
        if ($execution->conduction === 'manual') {
            $execution->update([
                'state' => 'awaiting_manual_step',
                'paused_at' => now(),
            ]);

            return $this->loadForRead($execution->refresh());
        }

        $execution->refresh()->load(['crawlAgency', 'contract']);
        $this->queueCurrentStep($execution);

        return $this->loadForRead($execution->refresh());
    }

    private function pauseForApproval(
        OnboardingExecution $execution,
        CrawlerOperation $operation,
    ): OnboardingExecution {
        $report = ProfileValidationReport::query()->where('operation_id', $operation->id)->first();
        if ($report === null) {
            return $this->requireAttention(
                $execution,
                'validation_report_missing',
                'Validation succeeded without a persisted Validation Report.',
            );
        }

        if ($execution->conduction === 'manual' && ! $report->eligible) {
            $execution->update([
                'state' => 'awaiting_manual_step',
                'current_step' => 'sample_url_confirmation',
                'paused_at' => now(),
                'attention_code' => 'validation_rejected',
                'attention_message' => 'Validation was rejected. Correct the sample URL to generate a new profile attempt.',
            ]);

            return $this->loadForRead($execution->refresh());
        }

        $execution->update([
            'state' => 'awaiting_approval',
            'current_step' => 'approval',
            'paused_at' => now(),
            'attention_code' => null,
            'attention_message' => null,
        ]);

        return $this->loadForRead($execution->refresh());
    }

    private function requireAttention(
        OnboardingExecution $execution,
        string $code,
        string $message,
    ): OnboardingExecution {
        $execution->update([
            'state' => 'requires_attention',
            'paused_at' => now(),
            'attention_code' => $code,
            'attention_message' => $message,
        ]);

        return $this->loadForRead($execution->refresh());
    }

    private function selectSampleUrl(DiscoverySnapshot $snapshot, string $rootDomain): ?string
    {
        foreach ($snapshot->urls()->orderBy('id')->pluck('url') as $url) {
            $parts = parse_url($url);
            $scheme = strtolower((string) ($parts['scheme'] ?? ''));
            $host = strtolower((string) ($parts['host'] ?? ''));
            $path = (string) ($parts['path'] ?? '');
            $normalizedRoot = strtolower($rootDomain);
            $belongsToAgency = $host === $normalizedRoot || str_ends_with($host, ".{$normalizedRoot}");

            if (in_array($scheme, ['http', 'https'], true) && $belongsToAgency && ! in_array($path, ['', '/'], true)) {
                return $url;
            }
        }

        return null;
    }

    private function loadForRead(OnboardingExecution $execution): OnboardingExecution
    {
        return $execution->load([
            'crawlAgency',
            'executionModel',
            'discoveryPolicy',
            'extractionPolicy',
            'discoverySnapshot',
            'operations' => fn ($query) => $query->orderBy('id'),
        ]);
    }
}
