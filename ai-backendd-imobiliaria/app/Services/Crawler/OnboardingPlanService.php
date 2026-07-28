<?php

namespace App\Services\Crawler;

use App\Models\Crawler\DiscoveryPolicyVersion;
use App\Models\Crawler\DiscoverySnapshot;
use App\Models\Crawler\ExtractionPolicyVersion;
use App\Models\Crawler\MarketDataContractVersion;
use App\Models\Crawler\OnboardingExecution;
use App\Models\Crawler\OnboardingExecutionModelVersion;
use App\Models\Crawler\OnboardingPlan;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OnboardingPlanService
{
    public function configure(OnboardingPlan $plan, array $data): OnboardingPlan
    {
        if ($plan->status !== 'draft') {
            throw ValidationException::withMessages([
                'status' => 'Only a draft Onboarding Plan can be configured.',
            ]);
        }

        $plan->update([
            'name' => $data['name'],
            'conduction' => $data['conduction'],
            'execution_model_version_id' => $data['conduction'] === 'automated'
                ? $data['execution_model_version_id']
                : null,
            'manual_configuration' => $data['conduction'] === 'manual'
                ? $data['manual_configuration']
                : null,
        ]);

        return $plan->refresh()->load('executionModel');
    }

    public function confirm(OnboardingPlan $plan, User $actor): OnboardingExecution
    {
        return DB::transaction(function () use ($actor, $plan): OnboardingExecution {
            DB::statement('SELECT pg_advisory_xact_lock(?)', [$plan->crawl_agency_id]);
            $lockedPlan = OnboardingPlan::query()->lockForUpdate()->findOrFail($plan->id);
            $existing = OnboardingExecution::query()
                ->where('crawl_agency_id', $lockedPlan->crawl_agency_id)
                ->whereNotIn('state', ['completed', 'cancelled'])
                ->first();

            if ($existing !== null) {
                return $existing->load($this->executionRelations());
            }

            if (
                $lockedPlan->status !== 'draft'
                || blank($lockedPlan->name)
                || ! in_array($lockedPlan->conduction, ['manual', 'automated'], true)
            ) {
                throw ValidationException::withMessages([
                    'onboarding_plan' => 'Configure a named Onboarding Plan before confirming it.',
                ]);
            }

            $contract = MarketDataContractVersion::query()->where('status', 'active')->first();
            if ($contract === null) {
                throw ValidationException::withMessages([
                    'market_data_contract_version_id' => 'An active Market Data Contract is required.',
                ]);
            }

            $selection = $lockedPlan->conduction === 'automated'
                ? $this->resolveAutomatedSelection($lockedPlan)
                : $this->resolveManualSelection($lockedPlan);
            $resolvedConfiguration = $selection['resolved_configuration'];
            $resolvedConfiguration['market_data_contract'] = [
                'id' => $contract->id,
                'version' => $contract->version,
                'fields' => $contract->fields,
            ];

            $execution = OnboardingExecution::query()->create([
                'onboarding_plan_id' => $lockedPlan->id,
                'crawl_agency_id' => $lockedPlan->crawl_agency_id,
                'name' => $lockedPlan->name,
                'conduction' => $lockedPlan->conduction,
                'state' => $selection['state'],
                'current_step' => $selection['current_step'],
                'execution_model_version_id' => $selection['execution_model_version_id'],
                'discovery_policy_version_id' => $selection['discovery_policy_version_id'],
                'extraction_policy_version_id' => $selection['extraction_policy_version_id'],
                'discovery_snapshot_id' => $selection['discovery_snapshot_id'],
                'market_data_contract_version_id' => $contract->id,
                'resolved_configuration' => $resolvedConfiguration,
                'sample_url' => $selection['sample_url'],
                'sample_url_selection' => $selection['sample_url_selection'],
                'created_by' => $actor->id,
            ]);

            $lockedPlan->update([
                'status' => 'in_progress',
                'confirmed_by' => $actor->id,
                'confirmed_at' => now(),
            ]);

            return $execution->load($this->executionRelations());
        });
    }

    private function resolveAutomatedSelection(OnboardingPlan $plan): array
    {
        if ($plan->execution_model_version_id === null) {
            throw ValidationException::withMessages([
                'execution_model_version_id' => 'Select an available execution model.',
            ]);
        }

        $model = OnboardingExecutionModelVersion::query()
            ->with(['discoveryPolicy', 'extractionPolicy'])
            ->where('status', 'available')
            ->find($plan->execution_model_version_id);
        if (
            $model === null
            || $model->discoveryPolicy?->status !== 'available'
            || $model->extractionPolicy?->status !== 'available'
        ) {
            throw ValidationException::withMessages([
                'execution_model_version_id' => 'The selected execution model is not available.',
            ]);
        }

        return [
            'state' => 'queued',
            'current_step' => 'discovery',
            'execution_model_version_id' => $model->id,
            'discovery_policy_version_id' => $model->discoveryPolicy->id,
            'extraction_policy_version_id' => $model->extractionPolicy->id,
            'discovery_snapshot_id' => null,
            'sample_url' => null,
            'sample_url_selection' => null,
            'resolved_configuration' => [
                'version' => 1,
                'execution_model' => [
                    'id' => $model->id,
                    'name' => $model->name,
                    'version' => $model->version,
                ],
                'discovery' => ['mode' => 'fresh'],
                'discovery_policy' => $this->resolvedDiscoveryPolicy($model->discoveryPolicy),
                'extraction_policy' => $this->resolvedExtractionPolicy($model->extractionPolicy),
            ],
        ];
    }

    private function resolveManualSelection(OnboardingPlan $plan): array
    {
        $manual = $plan->manual_configuration;
        if (! is_array($manual)) {
            throw ValidationException::withMessages([
                'manual_configuration' => 'Configure the manual onboarding steps before confirmation.',
            ]);
        }

        $discovery = data_get($manual, 'discovery', []);
        $extraction = data_get($manual, 'extraction', []);
        if (! is_array($discovery) || ! is_array($extraction)) {
            throw ValidationException::withMessages([
                'manual_configuration' => 'The manual onboarding configuration is invalid.',
            ]);
        }

        [$discoveryPolicyId, $resolvedDiscovery] = $this->resolveManualDiscoveryPolicy($discovery);
        [$extractionPolicyId, $resolvedExtraction] = $this->resolveManualExtractionPolicy($extraction);
        $mode = data_get($discovery, 'mode');
        $snapshotId = data_get($discovery, 'discovery_snapshot_id');

        if (! in_array($mode, ['fresh', 'existing'], true)) {
            throw ValidationException::withMessages([
                'manual_configuration.discovery.mode' => 'Choose fresh or existing Discovery.',
            ]);
        }
        if ($mode === 'existing') {
            $snapshot = DiscoverySnapshot::query()
                ->whereKey($snapshotId)
                ->where('crawl_agency_id', $plan->crawl_agency_id)
                ->first();
            if ($snapshot === null) {
                throw ValidationException::withMessages([
                    'manual_configuration.discovery.discovery_snapshot_id' => 'Select a Discovery Snapshot from this Crawl Agency.',
                ]);
            }
            $snapshotId = $snapshot->id;
            $sampleUrl = $this->selectSampleUrl($snapshot, $plan->crawlAgency()->value('root_domain'));
        } else {
            $snapshotId = null;
            $sampleUrl = null;
        }

        return [
            'state' => 'awaiting_manual_step',
            'current_step' => $mode === 'existing' ? 'sample_url_confirmation' : 'discovery',
            'execution_model_version_id' => null,
            'discovery_policy_version_id' => $discoveryPolicyId,
            'extraction_policy_version_id' => $extractionPolicyId,
            'discovery_snapshot_id' => $snapshotId,
            'sample_url' => $sampleUrl,
            'sample_url_selection' => $sampleUrl === null ? null : [
                'method' => 'first_eligible_snapshot_url_by_id',
                'discovery_snapshot_id' => $snapshotId,
                'url' => $sampleUrl,
                'confirmed' => false,
                'selected_at' => now()->toIso8601String(),
            ],
            'resolved_configuration' => [
                'version' => 1,
                'execution_model' => null,
                'discovery' => [
                    'mode' => $mode,
                    'discovery_snapshot_id' => $snapshotId,
                ],
                'discovery_policy' => $resolvedDiscovery,
                'extraction_policy' => $resolvedExtraction,
            ],
        ];
    }

    private function resolveManualDiscoveryPolicy(array $configuration): array
    {
        $policyId = data_get($configuration, 'policy_version_id');
        if ($policyId !== null) {
            $policy = DiscoveryPolicyVersion::query()
                ->where('status', 'available')
                ->find($policyId);
            if ($policy === null) {
                throw ValidationException::withMessages([
                    'manual_configuration.discovery.policy_version_id' => 'The selected Discovery Policy is not available.',
                ]);
            }

            return [$policy->id, $this->resolvedDiscoveryPolicy($policy)];
        }

        $point = data_get($configuration, 'point_configuration');
        if (! is_array($point) || ! is_array($point['strategies'] ?? null)) {
            throw ValidationException::withMessages([
                'manual_configuration.discovery' => 'Choose a Discovery Policy or Point Configuration.',
            ]);
        }

        return [null, [
            'id' => null,
            'name' => 'Point Configuration',
            'version' => null,
            'source' => 'point_configuration',
            'strategies' => $point['strategies'],
            'sources' => $point['strategies'],
            'configuration' => $point['configuration'] ?? [],
        ]];
    }

    private function resolveManualExtractionPolicy(array $configuration): array
    {
        $policyId = data_get($configuration, 'policy_version_id');
        if ($policyId !== null) {
            $policy = ExtractionPolicyVersion::query()
                ->where('status', 'available')
                ->find($policyId);
            if ($policy === null) {
                throw ValidationException::withMessages([
                    'manual_configuration.extraction.policy_version_id' => 'The selected Extraction Policy is not available.',
                ]);
            }

            return [$policy->id, $this->resolvedExtractionPolicy($policy)];
        }

        $point = data_get($configuration, 'point_configuration');
        if (! is_array($point) || ! is_array($point['strategies'] ?? null)) {
            throw ValidationException::withMessages([
                'manual_configuration.extraction' => 'Choose an Extraction Policy or Point Configuration.',
            ]);
        }

        return [null, [
            'id' => null,
            'name' => 'Point Configuration',
            'version' => null,
            'source' => 'point_configuration',
            'strategies' => $point['strategies'],
            'configuration' => $point['configuration'] ?? [],
        ]];
    }

    private function resolvedDiscoveryPolicy(DiscoveryPolicyVersion $policy): array
    {
        return [
            'id' => $policy->id,
            'name' => $policy->name,
            'version' => $policy->version,
            'source' => 'catalog',
            'strategies' => $policy->strategies,
            'sources' => $policy->strategies,
            'configuration' => $policy->configuration,
        ];
    }

    private function resolvedExtractionPolicy(ExtractionPolicyVersion $policy): array
    {
        return [
            'id' => $policy->id,
            'name' => $policy->name,
            'version' => $policy->version,
            'source' => 'catalog',
            'strategies' => $policy->strategies,
            'configuration' => $policy->configuration,
        ];
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

    private function executionRelations(): array
    {
        return [
            'crawlAgency',
            'executionModel',
            'discoveryPolicy',
            'extractionPolicy',
            'operations',
        ];
    }
}
