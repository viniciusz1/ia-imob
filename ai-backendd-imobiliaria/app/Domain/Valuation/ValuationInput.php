<?php

namespace App\Domain\Valuation;

final readonly class ValuationInput
{
    /**
     * @param  array<int, string>  $city
     * @param  array<int, string>  $neighborhood
     */
    public function __construct(
        public array $city,
        public array $neighborhood,
        public string $residentialType,
        public float $area,
        public int $bedrooms,
        public int $bathrooms,
        public int $garageSpaces,
        public bool $floodRisk,
    ) {}
}
