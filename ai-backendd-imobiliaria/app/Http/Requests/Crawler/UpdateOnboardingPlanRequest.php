<?php

namespace App\Http\Requests\Crawler;

use App\Models\Crawler\DiscoveryPolicyVersion;
use App\Models\Crawler\DiscoverySnapshot;
use App\Models\Crawler\DiscoveryStrategy;
use App\Models\Crawler\ExtractionPolicyVersion;
use App\Models\Crawler\OnboardingExecutionModelVersion;
use App\Support\Crawler\OnboardingStrategyCatalog;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateOnboardingPlanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:160'],
            'conduction' => ['required', Rule::in(['manual', 'automated'])],
            'first_production_discovery_mode' => [
                'sometimes',
                Rule::in(['fresh', 'validation_snapshot']),
            ],
            'execution_model_version_id' => [
                'nullable',
                'required_if:conduction,automated',
                'prohibited_if:conduction,manual',
                'integer',
                Rule::exists(OnboardingExecutionModelVersion::class, 'id')->where('status', 'available'),
            ],
            'manual_configuration' => [
                'nullable',
                'required_if:conduction,manual',
                'prohibited_if:conduction,automated',
                'array:discovery,extraction',
            ],
            'manual_configuration.discovery' => ['required_if:conduction,manual', 'array:mode,discovery_snapshot_id,policy_version_id,point_configuration'],
            'manual_configuration.discovery.mode' => ['required_if:conduction,manual', Rule::in(['fresh', 'existing'])],
            'manual_configuration.discovery.discovery_snapshot_id' => [
                'nullable',
                'required_if:manual_configuration.discovery.mode,existing',
                'prohibited_unless:manual_configuration.discovery.mode,existing',
                'integer',
                Rule::exists(DiscoverySnapshot::class, 'id'),
            ],
            'manual_configuration.discovery.policy_version_id' => [
                'nullable',
                'integer',
                Rule::exists(DiscoveryPolicyVersion::class, 'id')->where('status', 'available'),
            ],
            'manual_configuration.discovery.point_configuration' => [
                'nullable',
                'array:strategies,configuration',
            ],
            'manual_configuration.discovery.point_configuration.strategies' => [
                'required_with:manual_configuration.discovery.point_configuration',
                'array',
                'min:1',
            ],
            'manual_configuration.discovery.point_configuration.strategies.*' => [
                'required',
                'string',
                'max:80',
                'distinct',
                Rule::exists(DiscoveryStrategy::class, 'key')
                    ->where('active', true)
                    ->where('safety_status', 'safe'),
            ],
            'manual_configuration.discovery.point_configuration.configuration' => [
                'sometimes',
                'array:max_urls,include_subdomains,use_browser_for_homepage,query,score_threshold,probe_paths,common_subdomains',
            ],
            'manual_configuration.discovery.point_configuration.configuration.max_urls' => ['sometimes', 'integer', 'min:1', 'max:10000'],
            'manual_configuration.discovery.point_configuration.configuration.include_subdomains' => ['sometimes', 'boolean'],
            'manual_configuration.discovery.point_configuration.configuration.use_browser_for_homepage' => ['sometimes', 'boolean'],
            'manual_configuration.discovery.point_configuration.configuration.query' => ['sometimes', 'nullable', 'string', 'max:255'],
            'manual_configuration.discovery.point_configuration.configuration.score_threshold' => ['sometimes', 'numeric', 'between:0,1'],
            'manual_configuration.discovery.point_configuration.configuration.probe_paths' => ['sometimes', 'array', 'max:100'],
            'manual_configuration.discovery.point_configuration.configuration.probe_paths.*' => ['string', 'starts_with:/', 'not_regex:/\.\./', 'max:255'],
            'manual_configuration.discovery.point_configuration.configuration.common_subdomains' => ['sometimes', 'array', 'max:100'],
            'manual_configuration.discovery.point_configuration.configuration.common_subdomains.*' => [
                'string',
                'regex:/^(?!-)[A-Za-z0-9-]{1,63}(?<!-)$/',
            ],
            'manual_configuration.extraction' => ['required_if:conduction,manual', 'array:policy_version_id,point_configuration'],
            'manual_configuration.extraction.policy_version_id' => [
                'nullable',
                'integer',
                Rule::exists(ExtractionPolicyVersion::class, 'id')->where('status', 'available'),
            ],
            'manual_configuration.extraction.point_configuration' => [
                'nullable',
                'array:strategies,configuration',
            ],
            'manual_configuration.extraction.point_configuration.strategies' => [
                'required_with:manual_configuration.extraction.point_configuration',
                'array',
                'min:1',
            ],
            'manual_configuration.extraction.point_configuration.strategies.*' => [
                'required',
                'string',
                'distinct',
                Rule::in(OnboardingStrategyCatalog::EXTRACTION_STRATEGIES),
            ],
            'manual_configuration.extraction.point_configuration.configuration' => ['sometimes', 'array', 'max:0'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($this->input('conduction') !== 'manual') {
                    return;
                }

                $manual = $this->input('manual_configuration', []);
                if (! is_array($manual)) {
                    return;
                }

                $this->validatePolicyChoice($validator, $manual, 'discovery');
                $this->validatePolicyChoice($validator, $manual, 'extraction');
                $this->validateSnapshotAgency($validator, $manual);

                $strategies = data_get(
                    $manual,
                    'extraction.point_configuration.strategies',
                    [],
                );
                if (
                    is_array($strategies)
                    && $strategies !== []
                    && ! OnboardingStrategyCatalog::isCanonicalExtractionOrder($strategies)
                ) {
                    $validator->errors()->add(
                        'manual_configuration.extraction.point_configuration.strategies',
                        'Extraction strategies must preserve the canonical fallback order.',
                    );
                }
            },
        ];
    }

    private function validatePolicyChoice(
        Validator $validator,
        array $manual,
        string $kind,
    ): void {
        $policyId = data_get($manual, "{$kind}.policy_version_id");
        $pointConfiguration = data_get($manual, "{$kind}.point_configuration");
        $choiceCount = (int) ($policyId !== null) + (int) is_array($pointConfiguration);

        if ($choiceCount !== 1) {
            $validator->errors()->add(
                "manual_configuration.{$kind}",
                'Choose exactly one available policy or one Point Configuration.',
            );
        }
    }

    private function validateSnapshotAgency(Validator $validator, array $manual): void
    {
        $snapshotId = data_get($manual, 'discovery.discovery_snapshot_id');
        $agency = $this->route('crawlAgency');
        if (! is_numeric($snapshotId) || $agency === null) {
            return;
        }

        if (
            ! DiscoverySnapshot::query()
                ->whereKey((int) $snapshotId)
                ->where('crawl_agency_id', $agency->id)
                ->exists()
        ) {
            $validator->errors()->add(
                'manual_configuration.discovery.discovery_snapshot_id',
                'The Discovery Snapshot belongs to another Crawl Agency.',
            );
        }
    }
}
