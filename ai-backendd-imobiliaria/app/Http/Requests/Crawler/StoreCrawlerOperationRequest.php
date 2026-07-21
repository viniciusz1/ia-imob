<?php

namespace App\Http\Requests\Crawler;

use App\Models\Crawler\CrawlAgency;
use App\Models\Crawler\MarketDataContractVersion;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCrawlerOperationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type' => ['required', Rule::in(['discovery'])],
            'crawl_agency_id' => ['required', 'integer', Rule::exists(CrawlAgency::class, 'id')],
            'market_data_contract_version_id' => [
                'required',
                'integer',
                Rule::exists(MarketDataContractVersion::class, 'id')->where('status', 'active'),
            ],
            'discovery_policy' => ['sometimes', 'array'],
            'discovery_policy.sources' => ['sometimes', 'array', 'min:1'],
            'discovery_policy.sources.*' => [
                'string',
                Rule::in(['sitemap', 'cc', 'wayback', 'crt', 'probe', 'robots', 'feed', 'homepage']),
            ],
            'discovery_policy.max_urls' => ['sometimes', 'integer', 'min:1', 'max:10000'],
            'discovery_policy.include_subdomains' => ['sometimes', 'boolean'],
            'discovery_policy.use_browser_for_homepage' => ['sometimes', 'boolean'],
            'discovery_policy.query' => ['sometimes', 'nullable', 'string', 'max:255'],
            'discovery_policy.score_threshold' => ['sometimes', 'numeric', 'between:0,1'],
            'discovery_policy.probe_paths' => ['sometimes', 'array', 'max:100'],
            'discovery_policy.probe_paths.*' => ['string', 'starts_with:/', 'max:255'],
            'discovery_policy.common_subdomains' => ['sometimes', 'array', 'max:100'],
            'discovery_policy.common_subdomains.*' => ['string', 'max:63'],
        ];
    }
}
