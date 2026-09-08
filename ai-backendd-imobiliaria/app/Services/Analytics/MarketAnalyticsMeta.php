<?php

namespace App\Services\Analytics;

use App\Domain\Analytics\MarketAnalyticsFilters;
use App\Repositories\Analytics\MarketSupplyRepository;
use Carbon\CarbonImmutable;

class MarketAnalyticsMeta
{
    private const SALE_ONLY_NOTICE = 'Os dados de mercado não separam venda de locação, então os indicadores de preço consideram apenas imóveis à venda.';

    public function __construct(private readonly MarketSupplyRepository $supply) {}

    /**
     * @param  list<string>  $notices
     * @return array<string, mixed>
     */
    public function for(MarketAnalyticsFilters $filters, array $notices = []): array
    {
        return [
            'generated_at' => CarbonImmutable::now(MarketAnalyticsFilters::TIMEZONE)->toIso8601String(),
            'data_reference_date' => $this->supply->referenceDate($filters)?->toIso8601String(),
            'notices' => [self::SALE_ONLY_NOTICE, ...$notices],
        ];
    }
}
