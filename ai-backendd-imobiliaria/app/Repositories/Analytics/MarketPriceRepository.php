<?php

namespace App\Repositories\Analytics;

use App\Domain\Analytics\MarketAnalyticsFilters;
use App\Domain\Analytics\PriceMetric;
use App\Domain\Analytics\StatisticalSummary;
use App\Domain\Analytics\SupplyDimension;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Database\Query\JoinClause;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class MarketPriceRepository
{
    private const IQR_MULTIPLIER = 1.5;

    private const AGGREGATES = 'count(*) as sample_size,
        percentile_cont(0.5) within group (order by v.value) as median,
        avg(v.value) as average,
        percentile_cont(0.25) within group (order by v.value) as p25,
        percentile_cont(0.75) within group (order by v.value) as p75';

    public function __construct(private readonly MarketStockQuery $stock) {}

    public function summarize(MarketAnalyticsFilters $filters, PriceMetric $metric): StatisticalSummary
    {
        $values = $this->values($filters, $metric);
        $bounds = DB::query()->fromSub($values, 'v')->selectRaw($this->boundsSelection())->first();

        if ((int) ($bounds->raw_count ?? 0) === 0) {
            return StatisticalSummary::empty();
        }

        $summary = DB::query()
            ->fromSub($values, 'v')
            ->whereBetween('v.value', $this->fence((float) $bounds->q1, (float) $bounds->q3))
            ->selectRaw(self::AGGREGATES)
            ->first();

        return $this->summaryOf($summary, (int) $bounds->raw_count);
    }

    /**
     * @return Collection<string, StatisticalSummary>
     */
    public function summarizeBy(
        MarketAnalyticsFilters $filters,
        PriceMetric $metric,
        SupplyDimension $dimension,
    ): Collection {
        $values = $this->values($filters, $metric, $this->stock->groupingFor($dimension));

        $bounds = DB::query()->fromSub($values, 'v')
            ->selectRaw('v.grouping, '.$this->boundsSelection())
            ->groupBy('v.grouping');

        return DB::query()
            ->fromSub($bounds, 'b')
            ->leftJoinSub($values, 'v', fn (JoinClause $join) => $join
                ->on('v.grouping', '=', 'b.grouping')
                ->whereRaw($this->fenceCondition()))
            ->groupBy('b.grouping', 'b.raw_count')
            ->selectRaw('b.grouping as grouping, b.raw_count as raw_count, '.self::AGGREGATES)
            ->get()
            ->mapWithKeys(fn (object $row): array => [
                (string) $row->grouping => $this->summaryOf($row, (int) $row->raw_count),
            ]);
    }

    /**
     * @return Collection<string, array{sample_size: int, variation: float|null}>
     */
    public function dispersionBy(
        MarketAnalyticsFilters $filters,
        PriceMetric $metric,
        SupplyDimension $dimension,
    ): Collection {
        $values = $this->values($filters, $metric, $this->stock->groupingFor($dimension));

        return DB::query()->fromSub($values, 'v')
            ->groupBy('v.grouping')
            ->selectRaw('v.grouping as grouping, count(*) as sample_size, stddev_samp(v.value) / nullif(avg(v.value), 0) as variation')
            ->get()
            ->mapWithKeys(function (object $row): array {
                $sampleSize = (int) $row->sample_size;

                return [(string) $row->grouping => [
                    'sample_size' => $sampleSize,
                    'variation' => $sampleSize < StatisticalSummary::MINIMUM_SAMPLE || $row->variation === null
                        ? null
                        : round((float) $row->variation, 4),
                ]];
            });
    }

    private function values(
        MarketAnalyticsFilters $filters,
        PriceMetric $metric,
        ?Grouping $grouping = null,
    ): QueryBuilder {
        $expression = $this->stock->metric($metric);

        $selection = $grouping === null
            ? "{$expression} as value"
            : "{$grouping->expression} as grouping, {$expression} as value";

        $values = $this->stock->forMetric($filters, $metric)->getQuery()
            ->selectRaw($selection, $grouping?->bindings ?? [])
            ->whereRaw("{$expression} is not null");

        if ($grouping !== null && $grouping->nullable) {
            $values->whereRaw("{$grouping->expression} is not null", $grouping->bindings);
        }

        return $values;
    }

    private function boundsSelection(): string
    {
        return 'count(*) as raw_count,
            percentile_cont(0.25) within group (order by v.value) as q1,
            percentile_cont(0.75) within group (order by v.value) as q3';
    }

    private function fenceCondition(): string
    {
        $spread = self::IQR_MULTIPLIER.' * (b.q3 - b.q1)';

        return "v.value between b.q1 - {$spread} and b.q3 + {$spread}";
    }

    /**
     * @return array{0: float, 1: float}
     */
    private function fence(float $q1, float $q3): array
    {
        $spread = self::IQR_MULTIPLIER * ($q3 - $q1);

        return [$q1 - $spread, $q3 + $spread];
    }

    private function summaryOf(?object $row, int $rawCount): StatisticalSummary
    {
        $sampleSize = (int) ($row->sample_size ?? 0);

        return StatisticalSummary::of(
            $sampleSize,
            $rawCount - $sampleSize,
            $this->decimal($row?->median),
            $this->decimal($row?->average),
            $this->decimal($row?->p25),
            $this->decimal($row?->p75),
        );
    }

    private function decimal(mixed $value): ?float
    {
        return $value === null ? null : round((float) $value, 2);
    }
}
