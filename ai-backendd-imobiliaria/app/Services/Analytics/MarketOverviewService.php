<?php

namespace App\Services\Analytics;

use App\Domain\Analytics\FixedRanges;
use App\Domain\Analytics\LabelledCount;
use App\Domain\Analytics\MarketAnalyticsFilters;
use App\Domain\Analytics\SupplyDimension;
use App\Domain\Analytics\SupplyField;
use App\Repositories\Analytics\MarketSupplyRepository;
use Illuminate\Support\Collection;

class MarketOverviewService
{
    private const COMPLETENESS_FIELDS = [
        SupplyField::Price,
        SupplyField::Area,
        SupplyField::Type,
        SupplyField::City,
        SupplyField::Neighbourhood,
        SupplyField::Bedrooms,
        SupplyField::Suites,
        SupplyField::Bathrooms,
        SupplyField::ParkingSpaces,
        SupplyField::ConstructionYear,
        SupplyField::ListingUrl,
    ];

    public function __construct(private readonly MarketSupplyRepository $supply) {}

    /**
     * @return array<string, mixed>
     */
    public function handle(MarketAnalyticsFilters $filters): array
    {
        $total = $this->supply->total($filters);

        return [
            'total_supply' => ['indicator' => 'A1.01', 'value' => $total],
            'by_city' => $this->byDimension('A1.02', $filters, SupplyDimension::City, $total),
            'by_neighbourhood' => $this->byDimension('A1.03', $filters, SupplyDimension::Neighbourhood, $total),
            'by_type' => $this->block('A1.04', $this->supply->countByCanonicalType($filters), $total),
            'by_price_range' => $this->byRange('A1.05', $filters, SupplyField::Price, FixedRanges::price(), $total),
            'by_area_range' => $this->byRange('A1.06', $filters, SupplyField::Area, FixedRanges::area(), $total),
            'by_bedrooms' => $this->byBucket('A1.07', $filters, SupplyField::Bedrooms, FixedRanges::bedrooms(), $total),
            'by_parking_spaces' => $this->byBucket('A1.08', $filters, SupplyField::ParkingSpaces, FixedRanges::parkingSpaces(), $total),
            'by_agency' => $this->byDimension('A1.09', $filters, SupplyDimension::Agency, $total),
            'field_completeness' => $this->completeness($filters, $total),
        ];
    }

    /**
     * @return array{indicator: string, items: list<array<string, mixed>>}
     */
    private function byDimension(
        string $indicator,
        MarketAnalyticsFilters $filters,
        SupplyDimension $dimension,
        int $total,
    ): array {
        return $this->block($indicator, $this->supply->countBy($filters, $dimension), $total);
    }

    /**
     * @param  list<array{key: string, label: string, min: float|null, max: float|null}>  $ranges
     * @return array{indicator: string, items: list<array<string, mixed>>}
     */
    private function byRange(
        string $indicator,
        MarketAnalyticsFilters $filters,
        SupplyField $field,
        array $ranges,
        int $total,
    ): array {
        $counts = $this->supply->countByRange($filters, $field, $ranges);

        $items = collect($ranges)->map(fn (array $range): LabelledCount => new LabelledCount(
            $range['label'],
            (int) $counts->get($range['key'], 0),
            $range['key'],
        ));

        return $this->block($indicator, $items, $total);
    }

    /**
     * @param  list<array{key: string, label: string, value: int, open_ended: bool}>  $buckets
     * @return array{indicator: string, items: list<array<string, mixed>>}
     */
    private function byBucket(
        string $indicator,
        MarketAnalyticsFilters $filters,
        SupplyField $field,
        array $buckets,
        int $total,
    ): array {
        $counts = $this->supply->countByCardinal($filters, $field);

        $items = collect($buckets)->map(fn (array $bucket): LabelledCount => new LabelledCount(
            $bucket['label'],
            $this->countFor($counts, $bucket),
            $bucket['key'],
        ));

        return $this->block($indicator, $items, $total);
    }

    /**
     * @return array{indicator: string, items: list<array<string, mixed>>}
     */
    private function completeness(MarketAnalyticsFilters $filters, int $total): array
    {
        $filled = $this->supply->countFilled($filters, self::COMPLETENESS_FIELDS);

        $items = collect(self::COMPLETENESS_FIELDS)->map(fn (SupplyField $field): array => [
            'field' => $field->value,
            'filled' => (int) $filled->get($field->value, 0),
            'share' => $total === 0 ? 0.0 : round((int) $filled->get($field->value, 0) / $total, 4),
        ]);

        return ['indicator' => 'A1.10', 'items' => $items->all()];
    }

    /**
     * @param  Collection<int, LabelledCount>  $counts
     * @return array{indicator: string, items: list<array<string, mixed>>}
     */
    private function block(string $indicator, Collection $counts, int $total): array
    {
        return [
            'indicator' => $indicator,
            'items' => $counts->map(fn (LabelledCount $count): array => $count->toArray($total))->all(),
        ];
    }

    /**
     * @param  Collection<int, int>  $counts
     * @param  array{key: string, label: string, value: int, open_ended: bool}  $bucket
     */
    private function countFor(Collection $counts, array $bucket): int
    {
        if (! $bucket['open_ended']) {
            return (int) $counts->get($bucket['value'], 0);
        }

        return (int) $counts->filter(
            fn (int $count, int $value): bool => $value >= $bucket['value'],
        )->sum();
    }
}
