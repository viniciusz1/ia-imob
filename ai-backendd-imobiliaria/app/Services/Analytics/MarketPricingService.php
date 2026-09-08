<?php

namespace App\Services\Analytics;

use App\Domain\Analytics\MarketAnalyticsFilters;
use App\Domain\Analytics\PriceMetric;
use App\Domain\Analytics\StatisticalSummary;
use App\Domain\Analytics\SupplyDimension;
use App\Repositories\Analytics\MarketPriceRepository;

class MarketPricingService
{
    public function __construct(private readonly MarketPriceRepository $prices) {}

    /**
     * @return array<string, mixed>
     */
    public function handle(MarketAnalyticsFilters $filters): array
    {
        $announced = $this->prices->summarize($filters, PriceMetric::AnnouncedPrice);
        $perSquareMetre = $this->prices->summarize($filters, PriceMetric::PricePerSquareMetre);

        return [
            'median_price' => $this->value('A2.01', $announced, $announced->median),
            'average_price' => $this->value('A2.02', $announced, $announced->average),
            'central_price_range' => [
                'indicator' => 'A2.03',
                'p25' => $announced->firstQuartile,
                'p75' => $announced->thirdQuartile,
                ...$this->sample($announced),
            ],
            'median_price_per_square_metre' => $this->value('A2.04', $perSquareMetre, $perSquareMetre->median),
            'by_type' => $this->byDimension('A2.11', $filters, SupplyDimension::Type, withSquareMetre: true),
            'by_bedrooms' => $this->byDimension('A2.12', $filters, SupplyDimension::Bedrooms),
            'dispersion_by_neighbourhood' => [
                'indicator' => 'A2.13',
                'items' => $this->dispersion($filters),
            ],
        ];
    }

    /**
     * @return array{indicator: string, value: float|null, sample_size: int, insufficient_sample: bool, outliers_discarded: int}
     */
    private function value(string $indicator, StatisticalSummary $summary, ?float $value): array
    {
        return [
            'indicator' => $indicator,
            'value' => $value,
            ...$this->sample($summary),
        ];
    }

    /**
     * @return array{indicator: string, items: list<array<string, mixed>>}
     */
    private function byDimension(
        string $indicator,
        MarketAnalyticsFilters $filters,
        SupplyDimension $dimension,
        bool $withSquareMetre = false,
    ): array {
        $announced = $this->prices->summarizeBy($filters, PriceMetric::AnnouncedPrice, $dimension);

        $perSquareMetre = $withSquareMetre
            ? $this->prices->summarizeBy($filters, PriceMetric::PricePerSquareMetre, $dimension)
            : collect();

        $items = $announced
            ->map(fn (StatisticalSummary $summary, string $group): array => [
                'label' => $group,
                'median' => $summary->median,
                'median_per_square_metre' => $perSquareMetre->get($group)?->median,
                ...$this->sample($summary),
            ])
            ->sortByDesc('sample_size')
            ->values();

        return ['indicator' => $indicator, 'items' => $items->all()];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function dispersion(MarketAnalyticsFilters $filters): array
    {
        return $this->prices
            ->dispersionBy($filters, PriceMetric::AnnouncedPrice, SupplyDimension::Neighbourhood)
            ->map(fn (array $row, string $group): array => [
                'label' => $group,
                'variation' => $row['variation'],
                'sample_size' => $row['sample_size'],
                'insufficient_sample' => $row['variation'] === null,
            ])
            ->sortByDesc('sample_size')
            ->values()
            ->all();
    }

    /**
     * @return array{sample_size: int, insufficient_sample: bool, outliers_discarded: int}
     */
    private function sample(StatisticalSummary $summary): array
    {
        return [
            'sample_size' => $summary->sampleSize,
            'insufficient_sample' => $summary->isInsufficient(),
            'outliers_discarded' => $summary->outliersDiscarded,
        ];
    }
}
