<?php

namespace App\Domain\MarketInsights;

use Illuminate\Support\Str;

final class CatalogKeyNormalizer
{
    public static function normalize(string $value): string
    {
        $value = Str::slug($value, '-', 'pt');

        return trim($value, '-');
    }
}
