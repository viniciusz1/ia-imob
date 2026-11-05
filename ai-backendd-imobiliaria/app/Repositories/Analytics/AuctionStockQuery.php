<?php

namespace App\Repositories\Analytics;

use App\Domain\Analytics\AuctionPropertyType;
use App\Domain\Analytics\MarketAnalyticsFilters;
use Carbon\CarbonImmutable;
use Illuminate\Database\Query\Builder;
use Illuminate\Database\Query\JoinClause;
use Illuminate\Support\Facades\DB;

/**
 * Monta a consulta base do inventário de leilões: um lote por linha, já ligado
 * ao imóvel, ao evento e à rodada vigente, com os filtros gerais aplicados.
 */
class AuctionStockQuery
{
    public const LOT = 'lot';

    public const PROPERTY = 'prop';

    public const EVENT = 'event';

    public const ROUND = 'round';

    public const MARKET = 'mkt';

    /** Área considerada: a construída quando existe, senão a do terreno. */
    public const AREA = 'coalesce('.self::PROPERTY.'.built_area_m2, '.self::PROPERTY.'.land_area_m2)';

    public const BID = self::ROUND.'.minimum_bid';

    public const APPRAISAL = self::ROUND.'.appraisal_value';

    /** Desconto do lance mínimo sobre a avaliação judicial, entre 0 e 1. */
    public const DISCOUNT = 'case when '.self::APPRAISAL.' > 0 and '.self::BID.' > 0
        then 1 - ('.self::BID.' / '.self::APPRAISAL.') end';

    /** Valor que o mercado pediria pela mesma área naquele bairro. */
    public const MARKET_ESTIMATE = self::MARKET.'.median_per_square_metre * '.self::AREA;

    /** Quanto o lance mínimo está abaixo do valor estimado de mercado. */
    public const MARKET_GAP = 'case when '.self::MARKET_ESTIMATE.' > 0 and '.self::BID.' > 0
        then 1 - ('.self::BID.' / ('.self::MARKET_ESTIMATE.')) end';

    public const NEIGHBOURHOOD_KEY = 'lower(trim('.self::PROPERTY.'.neighborhood))';

    /**
     * A rodada vigente é a apontada pelo lote; sem ela, vale a primeira rodada
     * cadastrada, que é a que ainda vai acontecer.
     */
    private const CURRENT_ROUND = 'coalesce('.self::LOT.'.current_round_id, (
        select r.id from auction_rounds r
        where r.auction_event_property_id = '.self::LOT.'.id
        order by r.round_number limit 1
    ))';

    /**
     * @param  array<string, float>  $marketMedians  mediana de R$/m² por bairro
     */
    public function lots(MarketAnalyticsFilters $filters, array $marketMedians = []): Builder
    {
        $query = DB::table('auction_event_properties as '.self::LOT)
            ->join('auction_properties as '.self::PROPERTY, self::PROPERTY.'.id', '=', self::LOT.'.auction_property_id')
            ->join('auction_events as '.self::EVENT, self::EVENT.'.id', '=', self::LOT.'.auction_event_id')
            ->join('auction_rounds as '.self::ROUND, fn (JoinClause $join) => $join
                ->on(self::ROUND.'.id', '=', DB::raw(self::CURRENT_ROUND)))
            ->where(self::LOT.'.inventory_state', 'published');

        $this->joinMarketMedians($query, $marketMedians);
        $this->applyFilters($query, $filters);

        return $query;
    }

    public function latestObservedAt(MarketAnalyticsFilters $filters): ?CarbonImmutable
    {
        $latest = $this->lots($filters)->max(self::LOT.'.observed_at');

        return $latest === null
            ? null
            : CarbonImmutable::parse($latest)->setTimezone(MarketAnalyticsFilters::TIMEZONE);
    }

    /**
     * Liga cada lote à mediana de R$/m² do seu bairro. Sem mediana para o
     * bairro, o lote continua na conta com os indicadores de mercado vazios.
     *
     * @param  array<string, float>  $marketMedians
     */
    private function joinMarketMedians(Builder $query, array $marketMedians): void
    {
        $rows = [];
        $bindings = [];

        foreach ($marketMedians as $neighbourhood => $median) {
            $rows[] = '(lower(trim(?)), ?::numeric)';
            $bindings[] = (string) $neighbourhood;
            $bindings[] = $median;
        }

        // Sem nenhuma mediana, uma linha nula mantém o join de pé e deixa os
        // indicadores de mercado vazios em vez de quebrar a consulta.
        if ($rows === []) {
            $rows[] = '(null::text, null::numeric)';
        }

        $values = '(values '.implode(', ', $rows).') as '.self::MARKET.'(neighbourhood, median_per_square_metre)';

        $query->addBinding($bindings, 'join');
        $query->leftJoin(DB::raw($values), fn (JoinClause $join) => $join
            ->on(DB::raw(self::MARKET.'.neighbourhood'), '=', DB::raw(self::NEIGHBOURHOOD_KEY)));
    }

    private function applyFilters(Builder $query, MarketAnalyticsFilters $filters): void
    {
        $query
            ->when($filters->from, fn (Builder $q, CarbonImmutable $from) => $q
                ->where(self::ROUND.'.starts_at', '>=', $from->startOfDay()))
            ->when($filters->to, fn (Builder $q, CarbonImmutable $to) => $q
                ->where(self::ROUND.'.starts_at', '<=', $to->endOfDay()))
            ->when($filters->city, fn (Builder $q, string $city) => $q
                ->where(self::PROPERTY.'.city', 'ilike', $city))
            ->when($filters->minPrice, fn (Builder $q, float $min) => $q->where(self::BID, '>=', $min))
            ->when($filters->maxPrice, fn (Builder $q, float $max) => $q->where(self::BID, '<=', $max))
            ->when($filters->minArea, fn (Builder $q, float $min) => $q->whereRaw(self::AREA.' >= ?', [$min]))
            ->when($filters->maxArea, fn (Builder $q, float $max) => $q->whereRaw(self::AREA.' <= ?', [$max]));

        if ($filters->neighbourhoods !== []) {
            $query->whereIn(DB::raw(self::NEIGHBOURHOOD_KEY), array_map(
                static fn (string $neighbourhood): string => mb_strtolower(trim($neighbourhood)),
                $filters->neighbourhoods,
            ));
        }

        if ($filters->types !== []) {
            $query->whereIn(self::PROPERTY.'.property_type', AuctionPropertyType::valuesFor($filters->types));
        }
    }
}
