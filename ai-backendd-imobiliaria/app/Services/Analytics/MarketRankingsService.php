<?php

namespace App\Services\Analytics;

use App\Domain\Analytics\MarketAnalyticsFilters;
use App\Domain\Analytics\PriceMetric;
use App\Domain\Analytics\StatisticalSummary;
use App\Domain\Analytics\SupplyDimension;
use App\Repositories\Analytics\MarketPriceRepository;
use Illuminate\Support\Collection;

class MarketRankingsService
{
    public function __construct(private readonly MarketPriceRepository $prices) {}

    /**
     * @return array<string, mixed>
     */
    public function handle(MarketAnalyticsFilters $filters, int $limit): array
    {
        $byPrice = $this->neighbourhoodRanking($filters, PriceMetric::AnnouncedPrice);
        $bySquareMetre = $this->neighbourhoodRanking($filters, PriceMetric::PricePerSquareMetre);

        return [
            'neighbourhoods_by_price' => [
                'indicator' => 'A2.05',
                'items' => $byPrice->take($limit)->values()->all(),
            ],
            'neighbourhoods_by_square_metre' => [
                'indicator' => 'A2.06',
                'items' => $bySquareMetre->take($limit)->values()->all(),
            ],
        ];
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private function neighbourhoodRanking(MarketAnalyticsFilters $filters, PriceMetric $metric): Collection
    {
        return $this->prices
            ->summarizeBy($filters, $metric, SupplyDimension::Neighbourhood)
            ->reject(fn (StatisticalSummary $summary): bool => $summary->isInsufficient())
            ->map(fn (StatisticalSummary $summary, string $neighbourhood): array => [
                'label' => $neighbourhood,
                'median' => $summary->median,
                'sample_size' => $summary->sampleSize,
            ])
            ->sortByDesc('median')
            ->values();
    }
}
