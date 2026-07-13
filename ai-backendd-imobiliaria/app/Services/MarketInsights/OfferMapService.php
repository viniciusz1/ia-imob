<?php

namespace App\Services\MarketInsights;

use App\Domain\MarketInsights\CatalogMatcher;
use App\Domain\MarketInsights\OfferMapCalculator;
use App\Domain\MarketInsights\OfferMapInput;
use App\Domain\MarketInsights\PriceRange;
use App\Repositories\Contracts\CatalogRepositoryInterface;
use App\Repositories\Contracts\MarketPropertyRepositoryInterface;

class OfferMapService
{
    public function __construct(
        private MarketPropertyRepositoryInterface $marketPropertyRepository,
        private CatalogRepositoryInterface $catalogRepository,
        private CatalogMatcher $catalogMatcher,
        private OfferMapCalculator $calculator,
    ) {}

    /**
     * @param  array<string, mixed>  $filters
     */
    public function buildMap(string $city, array $filters = [], string $layer = 'stock', ?string $concentrationType = null): array
    {
        $input = new OfferMapInput(
            city: $city,
            filters: $filters,
            layer: $layer,
            concentrationType: $concentrationType,
        );

        $canonicalCity = $this->catalogRepository->findCityByName($city);

        if ($canonicalCity === null) {
            return $this->emptyMap($input, $filters);
        }

        $catalog = $this->catalogRepository->getCityCatalog($canonicalCity);
        $listings = $this->marketPropertyRepository->latestValidListingsForCity($city, $filters);

        $matchResult = $this->catalogMatcher->match(
            $listings,
            $catalog['city'],
            $catalog['neighborhoods'],
            $catalog['propertyTypes'],
        );

        $priceRanges = $this->defaultPriceRanges();

        $map = $this->calculator->calculate(
            input: $input,
            matchedNeighborhoods: $matchResult['neighborhoods'],
            unmappedListings: $matchResult['unmapped'],
            priceRanges: $priceRanges,
            sources: $listings->pluck('crawlerRun.source_name')->filter()->unique()->values()->all(),
            filters: $filters,
        );

        return $this->toArray($map);
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    private function emptyMap(OfferMapInput $input, array $filters): array
    {
        $map = $this->calculator->calculate(
            input: $input,
            matchedNeighborhoods: [],
            unmappedListings: [],
            priceRanges: $this->defaultPriceRanges(),
            sources: [],
            filters: $filters,
        );

        return $this->toArray($map);
    }

    /**
     * @return array<int, PriceRange>
     */
    private function defaultPriceRanges(): array
    {
        return [
            new PriceRange('Até R$ 200 mil', null, 200000),
            new PriceRange('R$ 200 mil - 400 mil', 200000, 400000),
            new PriceRange('R$ 400 mil - 600 mil', 400000, 600000),
            new PriceRange('R$ 600 mil - 1 milhão', 600000, 1000000),
            new PriceRange('Acima de R$ 1 milhão', 1000000, null),
        ];
    }

    private function toArray(\App\Domain\MarketInsights\CityOfferMap $map): array
    {
        return [
            'city' => $map->city,
            'total_count' => $map->totalCount,
            'neighborhoods' => array_map(fn ($neighborhood) => [
                'name' => $neighborhood->canonicalName,
                'original_name' => $neighborhood->originalName,
                'count' => $neighborhood->count,
                'city_share_percent' => $neighborhood->citySharePercent,
                'predominant_type' => $neighborhood->predominantType,
                'predominant_price_range' => $neighborhood->predominantPriceRange,
                'median_price' => $neighborhood->medianPrice,
                'p25_price' => $neighborhood->p25Price,
                'p75_price' => $neighborhood->p75Price,
                'typical_bedrooms' => $neighborhood->typicalBedrooms,
                'typical_garage_spaces' => $neighborhood->typicalGarageSpaces,
                'typical_area' => $neighborhood->typicalArea,
                'concentration' => $neighborhood->concentration,
                'sample_size' => $neighborhood->sampleSize,
                'listings' => $neighborhood->listings,
            ], $map->neighborhoods),
            'unmapped_listings' => $map->unmappedListings,
            'price_ranges' => array_map(fn ($range) => [
                'label' => $range->label,
                'min' => $range->min,
                'max' => $range->max,
            ], $map->priceRanges),
            'data_date' => $map->dataDate,
            'sources' => $map->sources,
            'filters' => $map->filters,
        ];
    }
}
