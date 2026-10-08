<?php

namespace App\Services\Analytics;

use App\Domain\Analytics\MarketAnalyticsFilters;
use App\Repositories\Analytics\MarketSupplyRepository;

class MarketOverviewService
{
    public function __construct(private readonly MarketSupplyRepository $supply) {}

    /**
     * @return array<string, mixed>
     */
    public function handle(MarketAnalyticsFilters $filters): array
    {
        return [
            'total_supply' => ['indicator' => 'A1.01', 'value' => $this->supply->total($filters)],
        ];
    }
}
