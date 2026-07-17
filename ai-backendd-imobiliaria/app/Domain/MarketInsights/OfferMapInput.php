<?php

namespace App\Domain\MarketInsights;

final readonly class OfferMapInput
{
    /**
     * @param  array<string, mixed>  $filters
     */
    public function __construct(
        public string $city,
        public array $filters = [],
        public string $layer = 'stock',
        public ?string $concentrationType = null,
    ) {}
}
