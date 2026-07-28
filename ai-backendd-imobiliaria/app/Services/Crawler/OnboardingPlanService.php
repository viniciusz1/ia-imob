<?php

namespace App\Services\Crawler;

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
            'execution_model_version_id' => $data['execution_model_version_id'],
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
                || $lockedPlan->conduction !== 'automated'
                || $lockedPlan->execution_model_version_id === null
            ) {
                throw ValidationException::withMessages([
                    'onboarding_plan' => 'Configure a named automated Onboarding Plan before confirming it.',
                ]);
            }

            $model = OnboardingExecutionModelVersion::query()
                ->with(['discoveryPolicy', 'extractionPolicy'])
                ->where('status', 'available')
                ->find($lockedPlan->execution_model_version_id);
            if (
                $model === null
                || $model->discoveryPolicy?->status !== 'available'
                || $model->extractionPolicy?->status !== 'available'
            ) {
                throw ValidationException::withMessages([
                    'execution_model_version_id' => 'The selected execution model is not available.',
                ]);
            }

            $contract = MarketDataContractVersion::query()->where('status', 'active')->first();
            if ($contract === null) {
                throw ValidationException::withMessages([
                    'market_data_contract_version_id' => 'An active Market Data Contract is required.',
                ]);
            }

            $resolvedConfiguration = [
                'version' => 1,
                'execution_model' => [
                    'id' => $model->id,
                    'name' => $model->name,
                    'version' => $model->version,
                ],
                'discovery_policy' => [
                    'id' => $model->discoveryPolicy->id,
                    'name' => $model->discoveryPolicy->name,
                    'version' => $model->discoveryPolicy->version,
                    'strategies' => $model->discoveryPolicy->strategies,
                    'configuration' => $model->discoveryPolicy->configuration,
                ],
                'extraction_policy' => [
                    'id' => $model->extractionPolicy->id,
                    'name' => $model->extractionPolicy->name,
                    'version' => $model->extractionPolicy->version,
                    'strategies' => $model->extractionPolicy->strategies,
                    'configuration' => $model->extractionPolicy->configuration,
                ],
                'market_data_contract' => [
                    'id' => $contract->id,
                    'version' => $contract->version,
                    'fields' => $contract->fields,
                ],
            ];

            $execution = OnboardingExecution::query()->create([
                'onboarding_plan_id' => $lockedPlan->id,
                'crawl_agency_id' => $lockedPlan->crawl_agency_id,
                'name' => $lockedPlan->name,
                'conduction' => 'automated',
                'state' => 'queued',
                'current_step' => 'discovery',
                'execution_model_version_id' => $model->id,
                'discovery_policy_version_id' => $model->discoveryPolicy->id,
                'extraction_policy_version_id' => $model->extractionPolicy->id,
                'market_data_contract_version_id' => $contract->id,
                'resolved_configuration' => $resolvedConfiguration,
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
