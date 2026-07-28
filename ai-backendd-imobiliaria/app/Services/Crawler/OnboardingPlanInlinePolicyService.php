<?php

namespace App\Services\Crawler;

use App\Models\Crawler\DiscoveryPolicyVersion;
use App\Models\Crawler\ExtractionPolicyVersion;
use App\Models\Crawler\OnboardingPlan;
use App\Models\User;
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
        if ($plan->status !== 'draft' || $plan->conduction !== 'manual') {
            throw ValidationException::withMessages([
                'onboarding_plan' => 'Only a draft manual plan can save a Point Configuration.',
            ]);
        }

        $point = data_get($plan->manual_configuration, "{$kind}.point_configuration");
        if (! is_array($point) || ! is_array($point['strategies'] ?? null)) {
            throw ValidationException::withMessages([
                'kind' => 'The selected manual step does not use a Point Configuration.',
            ]);
        }

        $data = [
            'name' => $name,
            'strategies' => $point['strategies'],
            'configuration' => $point['configuration'] ?? [],
        ];

        if ($kind === 'discovery') {
            $draft = $this->catalog->createDiscoveryPolicy($data, $actor);

            return $this->catalog->publishDiscoveryPolicy($draft);
        }

        $draft = $this->catalog->createExtractionPolicy($data, $actor);

        return $this->catalog->publishExtractionPolicy($draft);
    }
}
