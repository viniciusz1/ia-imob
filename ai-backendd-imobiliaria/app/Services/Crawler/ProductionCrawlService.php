<?php

namespace App\Services\Crawler;

use App\Models\Crawler\CrawlAgency;
use App\Models\Crawler\CrawlerOperation;
use App\Models\Crawler\DiscoveryPolicyVersion;
use App\Models\Crawler\DiscoverySnapshot;
use App\Models\Crawler\ExtractionProfile;
use App\Models\Crawler\OnboardingExecution;
use App\Models\Crawler\QualityPolicyVersion;
use App\Models\User;
use App\Support\Crawler\DiscoveryPolicyPlan;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProductionCrawlService
{
    public function __construct(
        private readonly CrawlerOperationService $operations,
    ) {}

    public function queue(array $input, User $requester): CrawlerOperation
    {
        $agency = CrawlAgency::query()->findOrFail($input['crawl_agency_id']);
        $errors = [];
        if ($agency->lifecycle_state !== 'active' || $agency->revalidation_required) {
            $errors['crawl_agency_id'] = 'The Crawl Agency must be active and fully validated.';
        }

        $profile = isset($input['extraction_profile_id'])
            ? ExtractionProfile::query()->find($input['extraction_profile_id'])
            : ExtractionProfile::query()
                ->where('crawl_agency_id', $agency->id)
                ->where('status', 'active')
                ->first();
        if ($profile === null
            || $profile->crawl_agency_id !== $agency->id
            || ! in_array($profile->status, ['active', 'approved'], true)) {
            $errors['extraction_profile_id'] = 'Choose an active or approved profile from this Crawl Agency.';
        }

        $snapshot = null;
        if ($input['discovery_mode'] === 'existing') {
            $snapshot = DiscoverySnapshot::query()->find($input['discovery_snapshot_id'] ?? null);
            if ($snapshot === null || $snapshot->crawl_agency_id !== $agency->id) {
                $errors['discovery_snapshot_id'] = 'Choose a Discovery Snapshot from this Crawl Agency.';
            }
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        $contract = $profile->contract()->firstOrFail();
        if ($contract->status !== 'active') {
            throw ValidationException::withMessages([
                'extraction_profile_id' => 'The selected profile does not target the active Market Data Contract.',
            ]);
        }
        $policy = QualityPolicyVersion::query()->where('status', 'active')->latest('version')->firstOrFail();
        $discoveryPolicy = $this->resolveDiscoveryPolicy($agency, $input);
        $discovery = $snapshot === null
            ? ['mode' => 'fresh', 'base_url' => $agency->base_url]
            : [
                'mode' => 'existing',
                'snapshot_id' => $snapshot->id,
                'urls' => $snapshot->urls()->orderBy('id')->pluck('url')->all(),
            ];

        $plan = [
            'version' => 1,
            'type' => 'production_crawl',
            'trigger' => $input['trigger'] ?? 'manual',
            'crawl_agency_id' => $agency->id,
            'discovery' => $discovery,
            'discovery_policy' => $discoveryPolicy,
            'extraction_profile' => [
                'id' => $profile->id,
                'version' => $profile->version,
                'schemas' => $profile->schemas,
                'strategies' => $profile->strategies,
                'fields' => $profile->fields,
                'parameters' => $profile->parameters,
            ],
            'market_data_contract' => [
                'id' => $contract->id,
                'version' => $contract->version,
                'fields' => $contract->fields,
            ],
            'quality_policy' => [
                'id' => $policy->id,
                'version' => $policy->version,
                'rules' => $policy->rules,
            ],
        ];
        $extractionPolicy = data_get($profile->parameters, 'extraction_policy');
        if (is_array($extractionPolicy)) {
            $plan['extraction_policy'] = $extractionPolicy;
        }
        $equivalenceKey = hash('sha256', json_encode($plan, JSON_THROW_ON_ERROR));

        return DB::transaction(function () use ($agency, $contract, $equivalenceKey, $plan, $requester): CrawlerOperation {
            DB::statement('SELECT pg_advisory_xact_lock(?)', [$agency->id]);
            $pending = CrawlerOperation::query()
                ->where('type', 'production_crawl')
                ->where('state', 'queued')
                ->where('crawl_agency_id', $agency->id)
                ->where('equivalence_key', $equivalenceKey)
                ->first();
            if ($pending !== null) {
                return $pending;
            }

            return CrawlerOperation::query()->create([
                'type' => 'production_crawl',
                'state' => 'queued',
                'requested_by' => $requester->id,
                'crawl_agency_id' => $agency->id,
                'market_data_contract_version_id' => $contract->id,
                'equivalence_key' => $equivalenceKey,
                'plan' => $plan,
            ])->refresh();
        });
    }

    private function resolveDiscoveryPolicy(
        CrawlAgency $agency,
        array $input,
    ): array {
        $requestedId = $input['discovery_policy_version_id'] ?? null;
        $policyId = $requestedId ?? $agency->active_discovery_policy_version_id;
        $policy = DiscoveryPolicyVersion::query()
            ->whereKey($policyId)
            ->where('status', 'available')
            ->first();
        if ($policy === null) {
            throw ValidationException::withMessages([
                'discovery_policy_version_id' => 'An available active Discovery Policy is required.',
            ]);
        }

        $source = $requestedId !== null
            && (int) $requestedId !== (int) $agency->active_discovery_policy_version_id
                ? 'manual_override'
                : 'agency_active';

        return DiscoveryPolicyPlan::fromVersion($policy, $source);
    }

    public function queueFirstProduction(
        OnboardingExecution $execution,
        string $discoveryMode,
        User $requester,
        int $attempt,
    ): CrawlerOperation {
        if (
            $execution->approved_at === null
            || $execution->extraction_profile_id === null
            || ! in_array($discoveryMode, ['fresh', 'validation_snapshot'], true)
        ) {
            throw ValidationException::withMessages([
                'onboarding_execution' => 'Approve the onboarding before its first production.',
            ]);
        }

        $agency = CrawlAgency::query()->findOrFail($execution->crawl_agency_id);
        $profile = ExtractionProfile::query()
            ->whereKey($execution->extraction_profile_id)
            ->where('crawl_agency_id', $agency->id)
            ->where('status', 'active')
            ->first();
        if ($profile === null || $agency->lifecycle_state !== 'active') {
            throw ValidationException::withMessages([
                'onboarding_execution' => 'The approved profile and Crawl Agency must be active.',
            ]);
        }

        $contract = $profile->contract()->firstOrFail();
        if (
            $contract->status !== 'active'
            || (int) $contract->id !== (int) $execution->market_data_contract_version_id
        ) {
            throw ValidationException::withMessages([
                'market_data_contract_version_id' => 'The onboarding contract is no longer active.',
            ]);
        }

        $discoveryPolicy = data_get(
            $execution->resolved_configuration,
            'discovery_policy',
        );
        $extractionPolicy = data_get(
            $execution->resolved_configuration,
            'extraction_policy',
        );
        if (
            ! is_array($discoveryPolicy)
            || ! is_array($extractionPolicy)
            || (int) ($discoveryPolicy['id'] ?? 0)
                !== (int) $agency->active_discovery_policy_version_id
        ) {
            throw ValidationException::withMessages([
                'discovery_policy_version_id' => 'The approved Discovery Policy is not active.',
            ]);
        }

        $discovery = $this->firstProductionDiscovery(
            $execution,
            $agency,
            $discoveryMode,
        );
        $qualityPolicy = QualityPolicyVersion::query()
            ->where('status', 'active')
            ->latest('version')
            ->firstOrFail();
        $plan = [
            'version' => 1,
            'type' => 'production_crawl',
            'trigger' => 'onboarding_first_production',
            'crawl_agency_id' => $agency->id,
            'onboarding_execution_id' => $execution->id,
            'discovery' => $discovery,
            'discovery_policy' => $discoveryPolicy,
            'extraction_policy' => $extractionPolicy,
            'extraction_profile' => [
                'id' => $profile->id,
                'version' => $profile->version,
                'schemas' => $profile->schemas,
                'strategies' => $profile->strategies,
                'fields' => $profile->fields,
                'parameters' => $profile->parameters,
            ],
            'market_data_contract' => [
                'id' => $contract->id,
                'version' => $contract->version,
                'fields' => $contract->fields,
            ],
            'quality_policy' => [
                'id' => $qualityPolicy->id,
                'version' => $qualityPolicy->version,
                'rules' => $qualityPolicy->rules,
            ],
        ];

        $operation = $this->operations->queueEquivalent(
            type: 'production_crawl',
            agencyId: $agency->id,
            contractId: $contract->id,
            plan: $plan,
            requester: $requester,
            onboardingExecution: $execution,
            onboardingStep: 'first_production',
            attempt: $attempt,
        );
        if ($attempt > 1 && $operation->retry_of_operation_id === null) {
            $previous = $execution->operations()
                ->where('onboarding_step', 'first_production')
                ->where('attempt', '<', $attempt)
                ->latest('attempt')
                ->first();
            if ($previous !== null) {
                $operation->update(['retry_of_operation_id' => $previous->id]);
            }
        }

        return $operation->refresh();
    }

    private function firstProductionDiscovery(
        OnboardingExecution $execution,
        CrawlAgency $agency,
        string $mode,
    ): array {
        if ($mode === 'fresh') {
            return [
                'mode' => 'fresh',
                'requested_mode' => 'fresh',
                'base_url' => $agency->base_url,
            ];
        }

        $snapshot = DiscoverySnapshot::query()
            ->whereKey($execution->discovery_snapshot_id)
            ->where('crawl_agency_id', $agency->id)
            ->first();
        if ($snapshot === null) {
            throw ValidationException::withMessages([
                'discovery_mode' => 'The validation Discovery Snapshot is unavailable.',
            ]);
        }

        return [
            'mode' => 'existing',
            'requested_mode' => 'validation_snapshot',
            'snapshot_id' => $snapshot->id,
            'urls' => $snapshot->urls()->orderBy('id')->pluck('url')->all(),
        ];
    }
}
