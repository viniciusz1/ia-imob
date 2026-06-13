<?php

namespace App\Domain\Valuation;

final class ResidentialType
{
    public const HOUSE = 'house';

    public const APARTMENT = 'apartment';

    public const TOWNHOUSE = 'townhouse';

    public static function values(): array
    {
        return [
            self::HOUSE,
            self::APARTMENT,
            self::TOWNHOUSE,
        ];
    }

    public static function label(string $type): string
    {
        return match ($type) {
            self::HOUSE => 'Casa',
            self::APARTMENT => 'Apartamento',
            self::TOWNHOUSE => 'Sobrado',
            default => $type,
        };
    }

    public static function fromScrapedType(?string $type): ?string
    {
        $normalized = TextNormalizer::normalize((string) $type);

        if ($normalized === '') {
            return null;
        }

        if (str_contains($normalized, 'apartamento') || str_contains($normalized, 'apto')) {
            return self::APARTMENT;
        }

        if (str_contains($normalized, 'sobrado')) {
            return self::TOWNHOUSE;
        }

        if (str_contains($normalized, 'casa')) {
            return self::HOUSE;
        }

        return null;
    }
}
