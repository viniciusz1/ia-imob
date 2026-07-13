<?php

namespace App\Domain\MarketInsights;

final readonly class PriceRange
{
    public function __construct(
        public string $label,
        public ?float $min,
        public ?float $max,
    ) {}

    public function contains(float $price): bool
    {
        if ($this->min !== null && $price < $this->min) {
            return false;
        }

        if ($this->max !== null && $price >= $this->max) {
            return false;
        }

        return true;
    }
}
