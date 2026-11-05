<?php

namespace App\Services\Crawler;

use App\Models\Crawler\CrawlerOperation;
use App\Models\Crawler\DiscoveryPolicyVersion;
use App\Models\Crawler\ExtractionProfile;
use App\Models\Crawler\OnboardingExecution;
use App\Models\Crawler\ProfileValidationReport;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ExtractionProfileWorkflowService
{
    public function __construct(
        private readonly DistributedSnapshotSampler $sampler,
        private readonly CrawlerOperationService $operations,
    ) {}

    public function queueValidation(
        ExtractionProfile $profile,
        User $requester,
        ?array $extractionPolicy = null,
        ?OnboardingExecution $onboardingExecution = null,
        ?string $onboardingStep = null,
        int $attempt = 1,
        bool $linkToOnboarding = false,
        bool $forceStandalone = false,
    ): CrawlerOperation {
        if (! in_array($profile->status, ['candidate', 'revalidation_required'], true)) {
            throw ValidationException::withMessages(['status' => 'Only candidate profiles can be validated.']);
        }

        if ($onboardingExecution === null && $linkToOnboarding) {
            $activeExecution = OnboardingExecution::query()
                ->where('crawl_agency_id', $profile->crawl_agency_id)
                ->whereNotIn('state', ['completed', 'cancelled'])
                ->latest('id')
                ->first();

            if ($activeExecution !== null) {
                $onboardingExecution = $activeExecution;
                $onboardingStep = 'profile_validation';
                $attempt = ($activeExecution->operations()
                    ->where('onboarding_step', 'profile_validation')
                    ->max('attempt') ?? 0) + 1;

                if ($extractionPolicy === null && isset($activeExecution->resolved_configuration['extraction_policy'])) {
                    $extractionPolicy = $activeExecution->resolved_configuration['extraction_policy'];
                }

                $activeExecution->update([
                    'extraction_profile_id' => $profile->id,
                    'current_step' => 'profile_validation',
                    'state' => 'running',
                    'paused_at' => null,
                    'attention_code' => null,
                    'attention_message' => null,
                ]);
            }
        }

        if ($onboardingExecution === null && ! $forceStandalone && OnboardingExecution::query()
            ->where('crawl_agency_id', $profile->crawl_agency_id)
            ->whereNotIn('state', ['completed', 'cancelled'])
            ->exists()) {
            throw ValidationException::withMessages([
                'onboarding_execution' => 'This validation is controlled by the active Onboarding Execution.',
            ]);
        }

        $snapshot = $profile->discoverySnapshot()->firstOrFail();
        $urls = $snapshot->urls()->orderBy('id')->pluck('url')->all();
        $sample = $this->sampler->sample($urls, 20, $profile->sample_url);

        if ($sample === []) {
            throw ValidationException::withMessages(['discovery_snapshot_id' => 'The Discovery Snapshot has no URLs.']);
        }

        $plan = [
            'version' => 1,
            'type' => 'profile_validation',
            'crawl_agency_id' => $profile->crawl_agency_id,
            'extraction_profile_id' => $profile->id,
            'discovery_snapshot_id' => $profile->discovery_snapshot_id,
            'market_data_contract_version_id' => $profile->market_data_contract_version_id,
            'urls' => $sample,
            'schemas' => $profile->schemas,
            'fields' => $profile->fields,
            'thresholds' => [
                'valid_ratio' => 0.80,
                'required_field_coverage' => 0.90,
            ],
        ];
        if ($extractionPolicy !== null) {
            $plan['extraction_policy'] = $extractionPolicy;
        }

        return $this->operations->queueEquivalent(
            type: 'profile_validation',
            agencyId: $profile->crawl_agency_id,
            contractId: $profile->market_data_contract_version_id,
            plan: $plan,
            requester: $requester,
            onboardingExecution: $onboardingExecution,
            onboardingStep: $onboardingStep,
            attempt: $attempt,
        );
    }

    public function decide(ExtractionProfile $profile, string $decision, string $reason, User $actor): ExtractionProfile
    {
        if (! in_array($profile->status, ['candidate', 'revalidation_required'], true)) {
            throw ValidationException::withMessages(['status' => 'Only a pending profile can be decided.']);
        }

        $report = ProfileValidationReport::query()
            ->where('extraction_profile_id', $profile->id)
            ->latest('id')
            ->first();

        if ($decision === 'approved' && $report === null) {
            throw ValidationException::withMessages(['decision' => 'A validation report is required before approval.']);
        }

        return DB::transaction(function () use ($profile, $decision, $reason, $actor): ExtractionProfile {
            DB::statement('SELECT pg_advisory_xact_lock(?)', [$profile->crawl_agency_id]);
            $profile->update([
                'status' => $decision,
                'decided_by' => $actor->id,
                'decided_at' => now(),
                'decision_reason' => $reason,
            ]);

            if ($decision === 'approved') {
                $this->activateCrawlAgencyFromProfile($profile);
            }

            return $profile->refresh()->load(['latestValidationReport', 'decider', 'activator']);
        });
    }

    public function activate(ExtractionProfile $profile, User $actor): ExtractionProfile
    {
        if (! in_array($profile->status, ['approved', 'candidate', 'revalidation_required'], true)) {
            throw ValidationException::withMessages(['status' => 'Only an approved, candidate, or revalidation required profile can be activated.']);
        }

        if ($profile->market_data_contract_version_id !== $profile->contract()->where('status', 'active')->value('id')) {
            throw ValidationException::withMessages(['market_data_contract_version_id' => 'The profile contract is no longer active.']);
        }

        return DB::transaction(function () use ($profile, $actor): ExtractionProfile {
            DB::statement('SELECT pg_advisory_xact_lock(?)', [$profile->crawl_agency_id]);
            ExtractionProfile::query()
                ->where('crawl_agency_id', $profile->crawl_agency_id)
                ->where('status', 'active')
                ->update(['status' => 'approved']);
            $profile->update([
                'status' => 'active',
                'decided_by' => $profile->decided_by ?? $actor->id,
                'decided_at' => $profile->decided_at ?? now(),
                'decision_reason' => $profile->decision_reason ?? 'Ativado diretamente.',
                'activated_by' => $actor->id,
                'activated_at' => now(),
            ]);
            $this->activateCrawlAgencyFromProfile($profile);
            $this->approvePendingOnboardingExecution($profile, $actor);

            return $profile->refresh()->load(['latestValidationReport', 'decider', 'activator']);
        });
    }

    private function activateCrawlAgencyFromProfile(ExtractionProfile $profile): void
    {
        $agency = $profile->crawlAgency()->firstOrFail();
        $updates = ['revalidation_required' => false];

        if ($agency->lifecycle_state === 'onboarding') {
            $updates['lifecycle_state'] = 'active';
        }

        if ($agency->active_discovery_policy_version_id === null) {
            $policyId = OnboardingExecution::query()
                ->where('crawl_agency_id', $agency->id)
                ->whereNotNull('discovery_policy_version_id')
                ->latest('id')
                ->value('discovery_policy_version_id');

            if (
                $policyId !== null
                && DiscoveryPolicyVersion::query()
                    ->whereKey($policyId)
                    ->where('status', 'available')
                    ->exists()
            ) {
                $updates['active_discovery_policy_version_id'] = $policyId;
            }
        }

        $agency->update($updates);
    }

    private function approvePendingOnboardingExecution(ExtractionProfile $profile, User $actor): void
    {
        $execution = OnboardingExecution::query()
            ->where('crawl_agency_id', $profile->crawl_agency_id)
            ->where('state', 'awaiting_approval')
            ->latest('id')
            ->first();

        if ($execution === null) {
            return;
        }

        $report = ProfileValidationReport::query()
            ->where('extraction_profile_id', $profile->id)
            ->latest('id')
            ->first();

        $execution->update([
            'state' => 'awaiting_first_production',
            'current_step' => 'first_production',
            'first_production_discovery_mode' => $execution->first_production_discovery_mode ?? 'fresh',
            'extraction_profile_id' => $profile->id,
            'profile_validation_report_id' => $report?->id ?? $execution->profile_validation_report_id,
            'approved_by' => $actor->id,
            'approved_at' => now(),
            'approval_reason' => $profile->decision_reason ?? 'Ativado diretamente.',
            'paused_at' => now(),
            'attention_code' => null,
            'attention_message' => null,
        ]);
    }
}
