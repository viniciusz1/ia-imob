<?php

namespace App\Repositories\Analytics;

use App\Domain\Analytics\MarketAnalyticsFilters;
use Carbon\CarbonImmutable;

class MarketSupplyRepository
{
    public function __construct(private readonly MarketStockQuery $stock) {}

    public function total(MarketAnalyticsFilters $filters): int
    {
        return $this->stock->stock($filters)->count();
    }

    public function referenceDate(MarketAnalyticsFilters $filters): ?CarbonImmutable
    {
        return $this->stock->referenceDate($filters);
    }
}
