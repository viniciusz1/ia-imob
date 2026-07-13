<?php

namespace App\Domain\MarketInsights;

final readonly class NeighborhoodMetrics
{
    /**
     * @param  array<int, array<string, mixed>>  $listings
     */
    public function __construct(
        public string $canonicalName,
        public string $originalName,
        public int $count,
        public float $citySharePercent,
        public ?string $predominantType,
        public ?string $predominantPriceRange,
        public ?float $medianPrice,
        public ?float $p25Price,
        public ?float $p75Price,
        public ?int $typicalBedrooms,
        public ?int $typicalGarageSpaces,
        public ?float $typicalArea,
        public ?array $concentration,
        public int $sampleSize,
        public array $listings = [],
    ) {}
}
