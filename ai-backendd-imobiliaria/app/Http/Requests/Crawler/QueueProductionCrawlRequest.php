<?php

namespace App\Http\Requests\Crawler;

use App\Models\Crawler\DiscoveryPolicyVersion;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class QueueProductionCrawlRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'crawl_agency_id' => ['required', 'integer'],
            'discovery_mode' => ['required', Rule::in(['fresh', 'existing'])],
            'discovery_snapshot_id' => ['nullable', 'integer', 'required_if:discovery_mode,existing'],
            'only_new_urls' => ['sometimes', 'boolean', 'prohibited_unless:discovery_mode,existing'],
            'extraction_profile_id' => ['nullable', 'integer'],
            'discovery_policy_version_id' => [
                'nullable',
                'integer',
                Rule::exists(DiscoveryPolicyVersion::class, 'id')
                    ->where('status', 'available'),
            ],
        ];
    }
}
