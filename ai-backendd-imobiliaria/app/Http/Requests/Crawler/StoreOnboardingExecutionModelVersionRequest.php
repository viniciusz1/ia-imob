<?php

namespace App\Http\Requests\Crawler;

use App\Models\Crawler\DiscoveryPolicyVersion;
use App\Models\Crawler\ExtractionPolicyVersion;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreOnboardingExecutionModelVersionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:160'],
            'discovery_policy_version_id' => [
                'required',
                'integer',
                Rule::exists(DiscoveryPolicyVersion::class, 'id')->where('status', 'available'),
            ],
            'extraction_policy_version_id' => [
                'required',
                'integer',
                Rule::exists(ExtractionPolicyVersion::class, 'id')->where('status', 'available'),
            ],
        ];
    }
}
