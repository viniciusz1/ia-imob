<?php

namespace App\Services\Crawler;

use App\Models\Crawler\DiscoverySnapshot;
use App\Models\Crawler\ExtractionProfile;
use App\Models\Crawler\OnboardingExecution;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ManualOnboardingExecutionService
{
    public function __construct(
        private readonly CrawlerOperationService $operations,
        private readonly ExtractionProfileWorkflowService $profiles,
    ) {}

    public function act(
        OnboardingExecution $execution,
        string $action,
        ?string $sampleUrl,
        User $actor,
    ): OnboardingExecution {
        return DB::transaction(function () use ($action, $actor, $execution, $sampleUrl): OnboardingExecution {
            $locked = OnboardingExecution::query()
                ->with(['crawlAgency', 'contract'])
                ->lockForUpdate()
                ->findOrFail($execution->id);

            if ($locked->conduction !== 'manual') {
                throw ValidationException::withMessages([
                    'action' => 'Manual step actions are only valid for manual onboarding.',
                ]);
            }

            match ($action) {
                'run_discovery' => $this->runDiscovery($locked, $actor),
                'confirm_sample_url' => $this->confirmSampleUrl($locked, (string) $sampleUrl, false),
                'run_profile_generation' => $this->runProfileGeneration($locked, $actor),
                'run_profile_validation' => $this->runProfileValidation($locked, $actor),
                'correct_sample_url' => $this->confirmSampleUrl($locked, (string) $sampleUrl, true),
                'cancel' => $this->cancel($locked),
                default => throw ValidationException::withMessages(['action' => 'Unsupported manual action.']),
            };

            return $this->loadForRead($locked->refresh());
        });
    }

    private function runDiscovery(OnboardingExecution $execution, User $actor): void
    {
        $this->ensureNextAction($execution, 'discovery');
        if (data_get($execution->resolved_configuration, 'discovery.mode') !== 'fresh') {
            throw ValidationException::withMessages([
                'action' => 'This execution is configured to reuse an existing Discovery Snapshot.',
            ]);
        }

        $this->operations->queueDiscovery(
            $execution->crawlAgency,
            $execution->contract,
            $actor,
            $execution->resolved_configuration['discovery_policy'],
            $execution,
            'discovery',
            $this->nextAttempt($execution, 'discovery'),
        );
        $this->markRunning($execution);
    }

    private function confirmSampleUrl(
        OnboardingExecution $execution,
        string $sampleUrl,
        bool $correction,
    ): void {
        $this->ensureNextAction($execution, 'sample_url_confirmation');
        if ($correction !== ($execution->attention_code === 'validation_rejected')) {
            throw ValidationException::withMessages([
                'action' => $correction
                    ? 'A sample URL correction is not currently required.'
                    : 'Use the correction action after a rejected validation.',
            ]);
        }
        $this->ensureAgencyUrl($execution, $sampleUrl);
        $snapshot = DiscoverySnapshot::query()
            ->whereKey($execution->discovery_snapshot_id)
            ->where('crawl_agency_id', $execution->crawl_agency_id)
            ->first();
        if ($snapshot === null) {
            throw ValidationException::withMessages([
                'discovery_snapshot_id' => 'A Discovery Snapshot from this Crawl Agency is required.',
            ]);
        }

        $suggestedUrl = $execution->sample_url;
        $execution->update([
            'state' => 'awaiting_manual_step',
            'current_step' => 'profile_generation',
            'sample_url' => $sampleUrl,
            'sample_url_selection' => [
                'method' => $correction
                    ? 'operator_correction_after_rejected_validation'
                    : ($suggestedUrl === $sampleUrl ? 'operator_confirmed_suggestion' : 'operator_edited_suggestion'),
                'discovery_snapshot_id' => $snapshot->id,
                'url' => $sampleUrl,
                'confirmed' => true,
                'selected_at' => now()->toIso8601String(),
            ],
            'paused_at' => now(),
            'attention_code' => null,
            'attention_message' => null,
        ]);
    }

    private function runProfileGeneration(OnboardingExecution $execution, User $actor): void
    {
        $this->ensureNextAction($execution, 'profile_generation');
        if (
            blank($execution->sample_url)
            || data_get($execution->sample_url_selection, 'confirmed') !== true
        ) {
            throw ValidationException::withMessages([
                'sample_url' => 'Confirm or edit the sample URL before profile generation.',
            ]);
        }

        $snapshot = DiscoverySnapshot::query()
            ->whereKey($execution->discovery_snapshot_id)
            ->where('crawl_agency_id', $execution->crawl_agency_id)
            ->first();
        if ($snapshot === null) {
            throw ValidationException::withMessages([
                'discovery_snapshot_id' => 'A Discovery Snapshot from this Crawl Agency is required.',
            ]);
        }

        $this->operations->queueProfileGeneration(
            $execution->crawlAgency,
            $snapshot,
            $execution->contract,
            $execution->sample_url,
            $actor,
            $execution->resolved_configuration['extraction_policy'],
            $execution,
            'profile_generation',
            $this->nextAttempt($execution, 'profile_generation'),
        );
        $this->markRunning($execution);
    }

    private function runProfileValidation(OnboardingExecution $execution, User $actor): void
    {
        $this->ensureNextAction($execution, 'profile_validation');
        $generation = $execution->operations()
            ->where('onboarding_step', 'profile_generation')
            ->where('state', 'succeeded')
            ->latest('attempt')
            ->first();
        $profile = $generation === null
            ? null
            : ExtractionProfile::query()
                ->where('created_by_operation_id', $generation->id)
                ->where('status', 'candidate')
                ->first();
        if ($profile === null) {
            throw ValidationException::withMessages([
                'extraction_profile_id' => 'A candidate profile from a successful generation is required.',
            ]);
        }

        $this->profiles->queueValidation(
            $profile,
            $actor,
            $execution->resolved_configuration['extraction_policy'],
            $execution,
            'profile_validation',
            $this->nextAttempt($execution, 'profile_validation'),
        );
        $this->markRunning($execution);
    }

    private function cancel(OnboardingExecution $execution): void
    {
        if (in_array($execution->state, ['completed', 'cancelled'], true)) {
            throw ValidationException::withMessages([
                'action' => 'Only a nonterminal execution can be cancelled.',
            ]);
        }

        $operation = $execution->operations()
            ->whereIn('state', ['queued', 'running', 'cancellation_requested'])
            ->latest('id')
            ->first();
        if ($operation?->state === 'queued') {
            $operation->forceFill([
                'state' => 'cancelled',
                'completed_at' => now(),
            ])->save();
        } elseif ($operation?->state === 'running') {
            $operation->forceFill([
                'state' => 'cancellation_requested',
                'cancellation_requested_at' => now(),
            ])->save();
        }

        $execution->update([
            'state' => 'cancelled',
            'paused_at' => now(),
            'completed_at' => now(),
            'attention_code' => null,
            'attention_message' => null,
        ]);
        $execution->onboardingPlan()->update([
            'status' => 'draft',
            'confirmed_by' => null,
            'confirmed_at' => null,
        ]);
    }

    private function ensureNextAction(OnboardingExecution $execution, string $step): void
    {
        if (
            $execution->state !== 'awaiting_manual_step'
            || $execution->current_step !== $step
        ) {
            throw ValidationException::withMessages([
                'action' => "The only allowed action belongs to the {$execution->current_step} step.",
            ]);
        }
    }

    private function ensureAgencyUrl(OnboardingExecution $execution, string $url): void
    {
        $host = strtolower((string) parse_url($url, PHP_URL_HOST));
        $root = strtolower($execution->crawlAgency->root_domain);
        if ($host !== $root && ! str_ends_with($host, ".{$root}")) {
            throw ValidationException::withMessages([
                'sample_url' => 'The sample URL must belong to the Crawl Agency domain.',
            ]);
        }
    }

    private function nextAttempt(OnboardingExecution $execution, string $step): int
    {
        return ((int) $execution->operations()
            ->where('onboarding_step', $step)
            ->max('attempt')) + 1;
    }

    private function markRunning(OnboardingExecution $execution): void
    {
        $execution->update([
            'state' => 'running',
            'started_at' => $execution->started_at ?? now(),
            'paused_at' => null,
            'attention_code' => null,
            'attention_message' => null,
        ]);
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
