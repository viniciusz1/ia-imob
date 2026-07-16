<?php

namespace App\Http\Requests\Crawler;

use App\Models\Crawler\CrawlAgency;
use App\Models\Crawler\DiscoverySnapshot;
use App\Models\Crawler\MarketDataContractVersion;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class GenerateExtractionProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'crawl_agency_id' => ['required', 'integer', Rule::exists(CrawlAgency::class, 'id')],
            'discovery_snapshot_id' => ['required', 'integer', Rule::exists(DiscoverySnapshot::class, 'id')],
            'market_data_contract_version_id' => ['required', 'integer', Rule::exists(MarketDataContractVersion::class, 'id')],
            'sample_url' => ['required', 'url:http,https', 'max:2048'],
            'sample_url_confirmed' => ['required', 'accepted'],
        ];
    }
}
