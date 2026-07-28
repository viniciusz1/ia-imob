<?php

namespace App\Services\Crawler;

use App\Models\Crawler\DiscoveryPolicyVersion;
use App\Models\Crawler\ExtractionProfile;
use App\Models\Crawler\OnboardingExecution;
use App\Models\Crawler\ProfileValidationReport;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OnboardingCompletionService
{
    public function __construct(
        private readonly ProductionCrawlService $production,
    ) {}

    public function approve(
        OnboardingExecution $execution,
        ?string $reason,
        User $actor,
    ): OnboardingExecution {
        return DB::transaction(function () use ($actor, $execution, $reason): OnboardingExecution {
            DB::statement('SELECT pg_advisory_xact_lock(?)', [$execution->crawl_agency_id]);
            $locked = OnboardingExecution::query()
                ->with(['crawlAgency', 'contract'])
                ->lockForUpdate()
                ->findOrFail($execution->id);

            if ($locked->approved_at !== null) {
                return $this->loadForRead($locked);
            }
            if (
                $locked->state !== 'awaiting_approval'
                || $locked->current_step !== 'approval'
            ) {
                throw ValidationException::withMessages([
                    'onboarding_execution' => 'Only an onboarding awaiting approval can be approved.',
                ]);
            }

            [$report, $profile] = $this->validatedProfile($locked);
            if (! $report->eligible && blank($reason)) {
                throw ValidationException::withMessages([
                    'reason' => 'Explain why an ineligible validation may proceed.',
                ]);
            }

            $discoveryPolicy = DiscoveryPolicyVersion::query()
                ->whereKey($locked->discovery_policy_version_id)
                ->where('status', 'available')
                ->first();
            if ($discoveryPolicy === null) {
                throw ValidationException::withMessages([
                    'discovery_policy_version_id' => 'Choose or explicitly save an available versioned Discovery Policy before approval.',
                ]);
            }
            if (
                $locked->contract?->status !== 'active'
                || (int) $profile->market_data_contract_version_id
                    !== (int) $locked->market_data_contract_version_id
            ) {
                throw ValidationException::withMessages([
                    'market_data_contract_version_id' => 'The validated Market Data Contract is no longer active.',
                ]);
            }

            ExtractionProfile::query()
                ->where('crawl_agency_id', $locked->crawl_agency_id)
                ->where('status', 'active')
                ->whereKeyNot($profile->id)
                ->update(['status' => 'approved']);
            $decisionReason = filled($reason)
                ? $reason
                : 'Validation report met the onboarding approval criteria.';
            $profile->update([
                'status' => 'active',
                'decided_by' => $actor->id,
                'decided_at' => now(),
                'decision_reason' => $decisionReason,
                'activated_by' => $actor->id,
                'activated_at' => now(),
            ]);
            $locked->crawlAgency->update([
                'lifecycle_state' => 'active',
                'revalidation_required' => false,
                'active_discovery_policy_version_id' => $discoveryPolicy->id,
            ]);

            $mode = $locked->first_production_discovery_mode ?? 'fresh';
            $locked->update([
                'state' => $locked->conduction === 'automated'
                    ? 'running'
                    : 'awaiting_first_production',
                'current_step' => 'first_production',
                'first_production_discovery_mode' => $mode,
                'extraction_profile_id' => $profile->id,
                'profile_validation_report_id' => $report->id,
                'approved_by' => $actor->id,
                'approved_at' => now(),
                'approval_reason' => $decisionReason,
                'paused_at' => $locked->conduction === 'manual' ? now() : null,
                'attention_code' => null,
                'attention_message' => null,
            ]);

            if ($locked->conduction === 'automated') {
                $this->production->queueFirstProduction(
                    $locked->refresh(),
                    $mode,
                    $actor,
                    1,
                );
            }

            return $this->loadForRead($locked->refresh());
        });
    }

    public function startFirstProduction(
        OnboardingExecution $execution,
        ?string $discoveryMode,
        User $actor,
    ): OnboardingExecution {
        return DB::transaction(function () use ($actor, $discoveryMode, $execution): OnboardingExecution {
            DB::statement('SELECT pg_advisory_xact_lock(?)', [$execution->crawl_agency_id]);
            $locked = OnboardingExecution::query()
                ->lockForUpdate()
                ->findOrFail($execution->id);
            $pending = $locked->operations()
                ->where('onboarding_step', 'first_production')
                ->whereIn('state', ['queued', 'running', 'cancellation_requested'])
                ->latest('attempt')
                ->first();
            if ($pending !== null) {
                return $this->loadForRead($locked);
            }

            $retryable = $locked->state === 'requires_attention'
                && $locked->current_step === 'first_production'
                && $locked->attention_code === 'first_production_failed';
            if (
                $locked->approved_at === null
                || (
                    $locked->state !== 'awaiting_first_production'
                    && ! $retryable
                )
            ) {
                throw ValidationException::withMessages([
                    'onboarding_execution' => 'The first production is not ready to start.',
                ]);
            }

            $mode = $discoveryMode
                ?? $locked->first_production_discovery_mode
                ?? 'fresh';
            $attempt = ((int) $locked->operations()
                ->where('onboarding_step', 'first_production')
                ->max('attempt')) + 1;
            $locked->update([
                'state' => 'running',
                'first_production_discovery_mode' => $mode,
                'paused_at' => null,
                'attention_code' => null,
                'attention_message' => null,
            ]);
            $this->production->queueFirstProduction(
                $locked->refresh(),
                $mode,
                $actor,
                $attempt,
            );

            return $this->loadForRead($locked->refresh());
        });
    }

    private function validatedProfile(
        OnboardingExecution $execution,
    ): array {
        $operation = $execution->operations()
            ->where('onboarding_step', 'profile_validation')
            ->where('state', 'succeeded')
            ->latest('attempt')
            ->first();
        $report = $operation === null
            ? null
            : ProfileValidationReport::query()
                ->where('operation_id', $operation->id)
                ->first();
        $profile = $report === null
            ? null
            : ExtractionProfile::query()
                ->whereKey($report->extraction_profile_id)
                ->where('crawl_agency_id', $execution->crawl_agency_id)
                ->whereIn('status', ['candidate', 'revalidation_required'])
                ->first();
        if ($report === null || $profile === null) {
            throw ValidationException::withMessages([
                'profile_validation_report_id' => 'A successful validation report and its candidate profile are required.',
            ]);
        }

        return [$report, $profile];
    }

    private function loadForRead(
        OnboardingExecution $execution,
    ): OnboardingExecution {
        return $execution->load([
            'crawlAgency',
            'executionModel',
            'discoveryPolicy',
            'extractionPolicy',
            'discoverySnapshot',
            'extractionProfile',
            'profileValidationReport',
            'firstProductionCrawlRun.qualityReport',
            'operations' => fn ($query) => $query->orderBy('id'),
        ]);
    }
}
