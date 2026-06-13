<?php

namespace App\Domain\Valuation;

final readonly class ValuationInput
{
    public function __construct(
        public string $city,
        public string $neighborhood,
        public string $residentialType,
        public float $area,
        public int $bedrooms,
        public int $bathrooms,
        public int $garageSpaces,
        public bool $floodRisk,
    ) {}
}
