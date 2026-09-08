<?php

namespace App\Services\Analytics;

use App\Domain\Analytics\MarketAnalyticsFilters;
use App\Domain\Analytics\PriceMetric;
use App\Domain\Analytics\StatisticalSummary;
use App\Domain\Analytics\SupplyDimension;
use App\Repositories\Analytics\MarketListingRepository;
use App\Repositories\Analytics\MarketPriceRepository;
use Illuminate\Support\Collection;

class MarketRankingsService
{
    public function __construct(
        private readonly MarketPriceRepository $prices,
        private readonly MarketListingRepository $listings,
    ) {}

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
            'neighbourhood_extremes' => [
                'indicator' => 'A2.07',
                'most_expensive' => $byPrice->first(),
                'cheapest' => $byPrice->last(),
            ],
            'most_expensive_listings' => [
                'indicator' => 'A2.08',
                'items' => $this->listings->rankedBy($filters, PriceMetric::AnnouncedPrice, 'desc', $limit)->all(),
            ],
            'highest_price_per_square_metre_listings' => [
                'indicator' => 'A2.09',
                'items' => $this->listings->rankedBy($filters, PriceMetric::PricePerSquareMetre, 'desc', $limit)->all(),
            ],
            'cheapest_listings' => [
                'indicator' => 'A2.10',
                'items' => $this->listings->rankedBy($filters, PriceMetric::AnnouncedPrice, 'asc', $limit, withinFence: true)->all(),
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
