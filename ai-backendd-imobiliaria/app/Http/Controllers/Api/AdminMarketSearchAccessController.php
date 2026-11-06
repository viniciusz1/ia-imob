<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AgencyResource;
use App\Models\Agency;
use App\Models\Crawler\CrawlAgency;
use App\Models\MarketProperty;
use App\Services\Crawler\CityCatalog;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminMarketSearchAccessController extends Controller
{
    private function cities(): array
    {
        return collect(CityCatalog::entries())->pluck('name')
            ->merge(MarketProperty::query()->latestRun()->whereNotNull('cidade')->distinct()->pluck('cidade')->map(fn ($city) => CityCatalog::canonicalNameFor($city))->filter())
            ->unique()->sort()->values()->all();
    }

    public function options()
    {
        return response()->json([
            'cities' => $this->cities(),
            'crawl_agencies' => CrawlAgency::query()->orderBy('name')->get(['id', 'name', 'root_domain']),
        ]);
    }

    public function update(Request $request, Agency $agency): AgencyResource
    {
        $data = $request->validate([
            'allowed_cities' => ['present', 'nullable', 'array', 'min:1'],
            'allowed_cities.*' => ['string', 'distinct', Rule::in($this->cities())],
            'allowed_crawl_agency_ids' => ['present', 'nullable', 'array', 'min:1'],
            'allowed_crawl_agency_ids.*' => ['integer', 'distinct', Rule::exists(CrawlAgency::class, 'id')],
        ]);
        $agency->configuration()->updateOrCreate([], $data);

        return new AgencyResource($agency->fresh('configuration'));
    }
}
