<?php

namespace App\Http\Requests\Crawler;

use App\Models\Crawler\DiscoveryStrategy;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateDiscoveryPolicyVersionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'strategies' => ['required', 'array', 'min:1'],
            'strategies.*' => [
                'required',
                'string',
                'max:80',
                'distinct',
                Rule::exists(DiscoveryStrategy::class, 'key')
                    ->where('active', true)
                    ->where('safety_status', 'safe'),
            ],
            'configuration' => [
                'sometimes',
                'array:max_urls,include_subdomains,use_browser_for_homepage,query,score_threshold,probe_paths,common_subdomains',
            ],
            'configuration.max_urls' => ['sometimes', 'integer', 'min:1', 'max:10000'],
            'configuration.include_subdomains' => ['sometimes', 'boolean'],
            'configuration.use_browser_for_homepage' => ['sometimes', 'boolean'],
            'configuration.query' => ['sometimes', 'nullable', 'string', 'max:255'],
            'configuration.score_threshold' => ['sometimes', 'numeric', 'between:0,1'],
            'configuration.probe_paths' => ['sometimes', 'array', 'max:100'],
            'configuration.probe_paths.*' => ['string', 'starts_with:/', 'not_regex:/\.\./', 'max:255'],
            'configuration.common_subdomains' => ['sometimes', 'array', 'max:100'],
            'configuration.common_subdomains.*' => [
                'string',
                'regex:/^(?!-)[A-Za-z0-9-]{1,63}(?<!-)$/',
            ],
        ];
    }
}
