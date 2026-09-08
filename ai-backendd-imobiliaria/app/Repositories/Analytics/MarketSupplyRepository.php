<?php

namespace App\Repositories\Analytics;

use App\Domain\Analytics\LabelledCount;
use App\Domain\Analytics\MarketAnalyticsFilters;
use App\Domain\Analytics\SupplyDimension;
use App\Domain\Analytics\SupplyField;
use Illuminate\Support\Collection;

class MarketSupplyRepository
{
    public function __construct(private readonly MarketStockQuery $stock) {}

    public function total(MarketAnalyticsFilters $filters): int
    {
        return $this->stock->stock($filters)->count();
    }

    /**
     * @return Collection<int, LabelledCount>
     */
    public function countBy(MarketAnalyticsFilters $filters, SupplyDimension $dimension): Collection
    {
        $column = $this->stock->dimension($dimension);

        return $this->stock->stock($filters)->getQuery()
            ->whereNotNull($column)
            ->where($column, '!=', '')
            ->groupBy($column)
            ->orderByRaw('count(*) desc')
            ->selectRaw("{$column} as label, count(*) as total")
            ->get()
            ->map(fn (object $row): LabelledCount => new LabelledCount((string) $row->label, (int) $row->total));
    }

    /**
     * @param  list<array{key: string, label: string, min: float|null, max: float|null}>  $ranges
     * @return Collection<string, int>
     */
    public function countByRange(MarketAnalyticsFilters $filters, SupplyField $field, array $ranges): Collection
    {
        $column = $this->stock->column($field);
        [$expression, $bindings] = $this->rangeExpression($column, $ranges);

        $counts = $this->stock->stock($filters)->getQuery()
            ->whereNotNull($column)
            ->where($column, '>', 0)
            ->selectRaw("{$expression} as bucket, count(*) as total", $bindings)
            ->groupByRaw('1')
            ->get()
            ->mapWithKeys(fn (object $row): array => [(string) $row->bucket => (int) $row->total]);

        return collect($ranges)->mapWithKeys(fn (array $range): array => [
            $range['key'] => (int) $counts->get($range['key'], 0),
        ]);
    }

    /**
     * @return Collection<int, int>
     */
    public function countByCardinal(MarketAnalyticsFilters $filters, SupplyField $field): Collection
    {
        $column = $this->stock->column($field);

        return $this->stock->stock($filters)->getQuery()
            ->whereNotNull($column)
            ->groupBy($column)
            ->selectRaw("{$column} as value, count(*) as total")
            ->get()
            ->mapWithKeys(fn (object $row): array => [(int) $row->value => (int) $row->total]);
    }

    /**
     * @param  list<SupplyField>  $fields
     * @return Collection<string, int>
     */
    public function countFilled(MarketAnalyticsFilters $filters, array $fields): Collection
    {
        $selection = array_map(
            fn (SupplyField $field): string => 'count('.$this->stock->column($field).') as '.$field->value,
            $fields,
        );

        $counts = $this->stock->stock($filters)->getQuery()
            ->selectRaw(implode(', ', $selection))
            ->first();

        return collect($fields)->mapWithKeys(fn (SupplyField $field): array => [
            $field->value => (int) ($counts->{$field->value} ?? 0),
        ]);
    }

    /**
     * @param  list<array{key: string, label: string, min: float|null, max: float|null}>  $ranges
     * @return array{0: string, 1: list<float|string>}
     */
    private function rangeExpression(string $column, array $ranges): array
    {
        $clauses = [];
        $bindings = [];
        $fallback = end($ranges)['key'];

        foreach ($ranges as $range) {
            if ($range['max'] === null) {
                continue;
            }

            $clauses[] = "when {$column} < ? then ?";
            $bindings[] = $range['max'];
            $bindings[] = $range['key'];
        }

        $bindings[] = $fallback;

        return ['case '.implode(' ', $clauses).' else ? end', $bindings];
    }
}
