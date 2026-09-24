<?php

namespace App\Services\Analytics;

use App\Domain\Analytics\MarketAnalyticsFilters;
use App\Repositories\Analytics\MarketSupplyRepository;
use Carbon\CarbonImmutable;

class MarketAnalyticsMeta
{
    public function __construct(private readonly MarketSupplyRepository $supply) {}

    /**
     * @return array<string, mixed>
     */
    public function for(MarketAnalyticsFilters $filters): array
    {
        return [
            'generated_at' => CarbonImmutable::now(MarketAnalyticsFilters::TIMEZONE)->toIso8601String(),
            'data_reference_date' => $this->supply->referenceDate($filters)?->toIso8601String(),
        ];
    }
}
