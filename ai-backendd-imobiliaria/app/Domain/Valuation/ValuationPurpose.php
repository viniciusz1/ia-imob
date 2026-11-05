<?php

namespace App\Domain\Valuation;

final class ValuationPurpose
{
    public const SALE = 'sale';

    public const RENT = 'rent';

    public static function values(): array
    {
        return [self::SALE, self::RENT];
    }

    public static function label(string $purpose): string
    {
        return $purpose === self::RENT ? 'Locação mensal' : 'Venda';
    }

    public static function money(float $value, string $purpose = self::SALE): string
    {
        if ($purpose === self::RENT) {
            return 'R$ '.number_format($value, 2, ',', '.').' /mês';
        }

        return 'R$ '.number_format(round($value / 1000) * 1000, 0, ',', '.');
    }
}
