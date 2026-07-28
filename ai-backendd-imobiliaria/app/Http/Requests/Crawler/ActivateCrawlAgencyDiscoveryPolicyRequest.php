<?php

namespace App\Http\Requests\Crawler;

use App\Models\Crawler\DiscoveryPolicyVersion;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ActivateCrawlAgencyDiscoveryPolicyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'source_policy_version_id' => [
                'required',
                'integer',
                Rule::exists(DiscoveryPolicyVersion::class, 'id')
                    ->where('status', 'available'),
            ],
            'confirmed' => ['required', 'accepted'],
        ];
    }
}
