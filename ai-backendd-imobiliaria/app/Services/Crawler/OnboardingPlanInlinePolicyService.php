<?php

namespace App\Services\Crawler;

use App\Models\Crawler\DiscoveryPolicyVersion;
use App\Models\Crawler\ExtractionPolicyVersion;
use App\Models\Crawler\OnboardingExecution;
use App\Models\Crawler\OnboardingPlan;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OnboardingPlanInlinePolicyService
{
    public function __construct(
        private readonly OnboardingPolicyCatalogService $catalog,
    ) {}

    public function save(
        OnboardingPlan $plan,
        string $kind,
        string $name,
        User $actor,
    ): DiscoveryPolicyVersion|ExtractionPolicyVersion {
        return DB::transaction(function () use ($actor, $kind, $name, $plan): DiscoveryPolicyVersion|ExtractionPolicyVersion {
            $lockedPlan = OnboardingPlan::query()
                ->lockForUpdate()
                ->findOrFail($plan->id);
            [$point, $execution] = $this->pointConfiguration(
                $lockedPlan,
                $kind,
            );

            $data = [
                'name' => $name,
                'strategies' => $point['strategies'],
                'configuration' => $point['configuration'] ?? [],
            ];

            if ($kind === 'discovery') {
                $draft = $this->catalog->createDiscoveryPolicy($data, $actor);
                $policy = $this->catalog->publishDiscoveryPolicy($draft);
            } else {
                $draft = $this->catalog->createExtractionPolicy($data, $actor);
                $policy = $this->catalog->publishExtractionPolicy($draft);
            }

            if ($execution !== null) {
                $execution->update([
                    ($kind === 'discovery'
                        ? 'discovery_policy_version_id'
                        : 'extraction_policy_version_id') => $policy->id,
                ]);
            }

            return $policy;
        });
    }

    private function pointConfiguration(
        OnboardingPlan $plan,
        string $kind,
    ): array {
        if ($plan->conduction !== 'manual') {
            throw ValidationException::withMessages([
                'onboarding_plan' => 'Only a manual plan can save a Point Configuration.',
            ]);
        }
        if ($plan->status === 'draft') {
            $point = data_get(
                $plan->manual_configuration,
                "{$kind}.point_configuration",
            );

            return [$this->validatedPoint($point), null];
        }
        if ($plan->status !== 'in_progress') {
            throw ValidationException::withMessages([
                'onboarding_plan' => 'The Onboarding Plan no longer accepts new policies.',
            ]);
        }

        $execution = OnboardingExecution::query()
            ->where('onboarding_plan_id', $plan->id)
            ->where('state', 'awaiting_approval')
            ->lockForUpdate()
            ->latest('id')
            ->first();
        $point = data_get(
            $execution?->resolved_configuration,
            "{$kind}_policy",
        );
        if (
            $execution === null
            || data_get($point, 'source') !== 'point_configuration'
        ) {
            throw ValidationException::withMessages([
                'onboarding_execution' => 'Only an execution awaiting approval with a Point Configuration can save this policy.',
            ]);
        }

        return [$this->validatedPoint($point), $execution];
    }

    private function validatedPoint(mixed $point): array
    {
        if (! is_array($point) || ! is_array($point['strategies'] ?? null)) {
            throw ValidationException::withMessages([
                'kind' => 'The selected manual step does not use a Point Configuration.',
            ]);
        }

        return $point;
    }
}
