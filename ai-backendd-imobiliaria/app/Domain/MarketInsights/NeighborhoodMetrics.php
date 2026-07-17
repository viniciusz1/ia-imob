<?php

namespace App\Domain\MarketInsights;

final readonly class NeighborhoodMetrics
{
    /**
     * @param  array<int, array{type: string, count: int, percent: float}>  $typeDistribution
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
        public int|string|null $typicalBedrooms,
        public int|string|null $typicalGarageSpaces,
        public ?float $typicalArea,
        public array $typeDistribution,
        public string $sampleQuality,
        public ?array $concentration,
        public int $sampleSize,
        public array $listings = [],
    ) {}
}
