<?php

namespace App\Repositories\Analytics;

use App\Domain\Analytics\MarketAnalyticsFilters;
use App\Models\PropertyValuation;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

/**
 * Agrega as avaliações salvas da imobiliária atual. O AgencyScope do model
 * restringe tudo à imobiliária de quem está autenticado.
 */
class ValuationAnalyticsRepository
{
    private const TABLE = 'property_valuations';

    private const CALCULATED = self::TABLE.'.final_central_value is not null';

    private const MEDIAN_VALUE = 'percentile_cont(0.5) within group (order by '.self::TABLE.'.final_central_value) filter (where '.self::CALCULATED.')';

    /**
     * Avaliações antigas guardam o bairro como string JSON e as novas como
     * array; nas duas o primeiro bairro informado vira o rótulo.
     */
    private const NEIGHBOURHOOD = 'case when json_typeof('.self::TABLE.".neighborhood) = 'array' then ".self::TABLE.'.neighborhood->>0 else '.self::TABLE.".neighborhood#>>'{}' end";

    private const MONTH = 'to_char(('.self::TABLE.".created_at at time zone 'UTC') at time zone '".MarketAnalyticsFilters::TIMEZONE."', 'YYYY-MM')";

    public function summary(MarketAnalyticsFilters $filters): object
    {
        return $this->valuations($filters)->toBase()
            ->selectRaw('count(*) as total')
            ->selectRaw('count(*) filter (where '.self::CALCULATED.') as calculated')
            ->selectRaw(self::MEDIAN_VALUE.' as median_value')
            ->selectRaw('avg('.self::TABLE.'.final_central_value) filter (where '.self::CALCULATED.') as average_value')
            ->selectRaw('percentile_cont(0.5) within group (order by '.self::TABLE.'.final_central_value / nullif('.self::TABLE.'.area, 0)) filter (where '.self::CALCULATED.') as median_per_square_metre')
            ->first();
    }

    public function latestCreatedAt(MarketAnalyticsFilters $filters): ?string
    {
        return $this->valuations($filters)->max(self::TABLE.'.created_at');
    }

    /**
     * @return Collection<int, object{label: string, count: int, median_value: float|null}>
     */
    public function byType(MarketAnalyticsFilters $filters): Collection
    {
        return $this->countBy($filters, self::TABLE.'.residential_type');
    }

    /**
     * @return Collection<int, object{label: string, count: int, median_value: float|null}>
     */
    public function byNeighbourhood(MarketAnalyticsFilters $filters): Collection
    {
        return $this->countBy($filters, self::NEIGHBOURHOOD);
    }

    /**
     * @return Collection<int, object{label: string, count: int, median_value: float|null}>
     */
    public function byUser(MarketAnalyticsFilters $filters): Collection
    {
        return $this->countBy($filters, 'users.name', fn (Builder $query) => $query
            ->join('users', 'users.id', '=', self::TABLE.'.user_id'));
    }

    /**
     * @return Collection<int, object{label: string, count: int}>
     */
    public function byMonth(MarketAnalyticsFilters $filters): Collection
    {
        return $this->valuations($filters)->toBase()
            ->selectRaw(self::MONTH.' as label, count(*) as count')
            ->groupByRaw(self::MONTH)
            ->orderBy('label')
            ->get();
    }

    private function countBy(MarketAnalyticsFilters $filters, string $expression, ?callable $join = null): Collection
    {
        $query = $this->valuations($filters);

        if ($join !== null) {
            $join($query);
        }

        return $query->toBase()
            ->selectRaw("{$expression} as label, count(*) as count, ".self::MEDIAN_VALUE.' as median_value')
            ->whereRaw("{$expression} is not null")
            ->groupByRaw($expression)
            ->orderByDesc('count')
            ->orderBy('label')
            ->get();
    }

    private function valuations(MarketAnalyticsFilters $filters): Builder
    {
        return PropertyValuation::query()
            ->when($filters->from, fn (Builder $q, CarbonImmutable $from) => $q->where(self::TABLE.'.created_at', '>=', $from->startOfDay()))
            ->when($filters->to, fn (Builder $q, CarbonImmutable $to) => $q->where(self::TABLE.'.created_at', '<=', $to->endOfDay()));
    }
}
