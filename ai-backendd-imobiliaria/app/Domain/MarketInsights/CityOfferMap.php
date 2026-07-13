<?php

namespace App\Domain\MarketInsights;

final readonly class CityOfferMap
{
    /**
     * @param  array<int, NeighborhoodMetrics>  $neighborhoods
     * @param  array<int, array<string, mixed>>  $unmappedListings
     * @param  array<int, PriceRange>  $priceRanges
     * @param  array<int, string>  $sources
     * @param  array<string, mixed>  $filters
     */
    public function __construct(
        public string $city,
        public int $totalCount,
        public array $neighborhoods,
        public array $unmappedListings,
        public array $priceRanges,
        public ?string $dataDate,
        public array $sources,
        public array $filters = [],
    ) {}
}
