<?php

namespace App\Repositories\Analytics;

use App\Domain\Analytics\MarketAnalyticsFilters;
use Illuminate\Support\Collection;

/**
 * Agrega o inventário de leilões já cruzado com a mediana de preço do mercado,
 * sempre por consulta: nada aqui grava ou coleta dado.
 */
class AuctionAnalyticsRepository
{
    private const MEDIAN_BID = 'percentile_cont(0.5) within group (order by '.AuctionStockQuery::BID.')
        filter (where '.AuctionStockQuery::BID.' > 0)';

    private const MEDIAN_DISCOUNT = 'percentile_cont(0.5) within group (order by ('.AuctionStockQuery::DISCOUNT.'))';

    private const MEDIAN_GAP = 'percentile_cont(0.5) within group (order by ('.AuctionStockQuery::MARKET_GAP.'))';

    private const BELOW_MARKET = '('.AuctionStockQuery::MARKET_GAP.') > 0';

    public function __construct(private readonly AuctionStockQuery $lots) {}

    /**
     * @param  array<string, float>  $marketMedians
     */
    public function summary(MarketAnalyticsFilters $filters, array $marketMedians): object
    {
        return $this->lots->lots($filters, $marketMedians)
            ->selectRaw('count(*) as total')
            ->selectRaw('count(*) filter (where ('.AuctionStockQuery::DISCOUNT.') is not null) as with_appraisal')
            ->selectRaw(self::MEDIAN_BID.' as median_minimum_bid')
            ->selectRaw('percentile_cont(0.5) within group (order by '.AuctionStockQuery::APPRAISAL.')
                filter (where '.AuctionStockQuery::APPRAISAL.' > 0) as median_appraisal')
            ->selectRaw(self::MEDIAN_DISCOUNT.' as median_discount')
            ->selectRaw('percentile_cont(0.5) within group (order by '.AuctionStockQuery::BID.' / nullif('.AuctionStockQuery::AREA.', 0))
                filter (where '.AuctionStockQuery::BID.' > 0) as median_bid_per_square_metre')
            ->selectRaw('count(*) filter (where ('.AuctionStockQuery::MARKET_GAP.') is not null) as compared_to_market')
            ->selectRaw('count(*) filter (where '.self::BELOW_MARKET.') as below_market')
            ->selectRaw(self::MEDIAN_GAP.' as median_market_gap')
            ->first();
    }

    /**
     * @param  array<string, float>  $marketMedians
     * @return Collection<int, object>
     */
    public function byModality(MarketAnalyticsFilters $filters, array $marketMedians): Collection
    {
        return $this->groupBy($filters, $marketMedians, AuctionStockQuery::EVENT.'.sale_modality');
    }

    /**
     * @param  array<string, float>  $marketMedians
     * @return Collection<int, object>
     */
    public function byType(MarketAnalyticsFilters $filters, array $marketMedians): Collection
    {
        return $this->groupBy($filters, $marketMedians, AuctionStockQuery::PROPERTY.'.property_type');
    }

    /**
     * @param  array<string, float>  $marketMedians
     * @return Collection<int, object>
     */
    public function byNeighbourhood(MarketAnalyticsFilters $filters, array $marketMedians): Collection
    {
        return $this->groupBy($filters, $marketMedians, AuctionStockQuery::PROPERTY.'.neighborhood');
    }

    /**
     * Os lotes com maior diferença entre o lance mínimo e o valor estimado de
     * mercado; sem mercado para comparar, vale o desconto sobre a avaliação.
     *
     * @param  array<string, float>  $marketMedians
     * @return Collection<int, object>
     */
    public function opportunities(MarketAnalyticsFilters $filters, array $marketMedians, int $limit): Collection
    {
        return $this->lots->lots($filters, $marketMedians)
            ->selectRaw(AuctionStockQuery::LOT.'.id as id')
            ->selectRaw('coalesce('.AuctionStockQuery::PROPERTY.'.title, '.AuctionStockQuery::EVENT.'.title) as title')
            ->selectRaw(AuctionStockQuery::PROPERTY.'.property_type as property_type')
            ->selectRaw(AuctionStockQuery::PROPERTY.'.city as city')
            ->selectRaw(AuctionStockQuery::PROPERTY.'.neighborhood as neighbourhood')
            ->selectRaw(AuctionStockQuery::EVENT.'.sale_modality as sale_modality')
            ->selectRaw(AuctionStockQuery::ROUND.'.status as status')
            ->selectRaw(AuctionStockQuery::ROUND.'.starts_at as starts_at')
            ->selectRaw(AuctionStockQuery::AREA.' as area')
            ->selectRaw(AuctionStockQuery::BID.' as minimum_bid')
            ->selectRaw(AuctionStockQuery::APPRAISAL.' as appraisal_value')
            ->selectRaw('('.AuctionStockQuery::DISCOUNT.') as discount')
            ->selectRaw('('.AuctionStockQuery::MARKET_ESTIMATE.') as market_estimate')
            ->selectRaw('('.AuctionStockQuery::MARKET_GAP.') as market_gap')
            ->selectRaw('coalesce('.AuctionStockQuery::LOT.'.canonical_url, '.AuctionStockQuery::EVENT.'.canonical_url) as url')
            ->whereRaw('('.AuctionStockQuery::MARKET_GAP.') > 0 or ('.AuctionStockQuery::DISCOUNT.') > 0')
            ->orderByRaw('coalesce(('.AuctionStockQuery::MARKET_GAP.'), ('.AuctionStockQuery::DISCOUNT.')) desc')
            ->orderBy(AuctionStockQuery::LOT.'.id')
            ->limit($limit)
            ->get();
    }

    /**
     * @param  array<string, float>  $marketMedians
     * @return Collection<int, object>
     */
    private function groupBy(MarketAnalyticsFilters $filters, array $marketMedians, string $expression): Collection
    {
        return $this->lots->lots($filters, $marketMedians)
            ->selectRaw("{$expression} as label")
            ->selectRaw('count(*) as count')
            ->selectRaw('count(*) filter (where '.self::BELOW_MARKET.') as below_market')
            ->selectRaw(self::MEDIAN_BID.' as median_minimum_bid')
            ->selectRaw(self::MEDIAN_DISCOUNT.' as median_discount')
            ->whereRaw("{$expression} is not null")
            ->groupByRaw($expression)
            ->orderByDesc('count')
            ->orderBy('label')
            ->get();
    }
}
