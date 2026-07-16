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
        ];
    }
}
