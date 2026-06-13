<?php

namespace App\Domain\Valuation;

use Illuminate\Support\Str;

final class TextNormalizer
{
    public static function normalize(string $value): string
    {
        return Str::of($value)
            ->ascii()
            ->lower()
            ->squish()
            ->toString();
    }
}
