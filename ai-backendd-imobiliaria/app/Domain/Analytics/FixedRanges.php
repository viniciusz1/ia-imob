<?php

namespace App\Domain\Analytics;

final class FixedRanges
{
    /**
     * @return list<array{key: string, label: string, min: float|null, max: float|null}>
     */
    public static function price(): array
    {
        return [
            ['key' => 'ate-200k', 'label' => 'Até R$ 200 mil', 'min' => null, 'max' => 200000.0],
            ['key' => '200k-350k', 'label' => 'R$ 200 mil a R$ 350 mil', 'min' => 200000.0, 'max' => 350000.0],
            ['key' => '350k-500k', 'label' => 'R$ 350 mil a R$ 500 mil', 'min' => 350000.0, 'max' => 500000.0],
            ['key' => '500k-750k', 'label' => 'R$ 500 mil a R$ 750 mil', 'min' => 500000.0, 'max' => 750000.0],
            ['key' => '750k-1m', 'label' => 'R$ 750 mil a R$ 1 milhão', 'min' => 750000.0, 'max' => 1000000.0],
            ['key' => '1m-2m', 'label' => 'R$ 1 milhão a R$ 2 milhões', 'min' => 1000000.0, 'max' => 2000000.0],
            ['key' => 'acima-2m', 'label' => 'Acima de R$ 2 milhões', 'min' => 2000000.0, 'max' => null],
        ];
    }

    /**
     * @return list<array{key: string, label: string, min: float|null, max: float|null}>
     */
    public static function area(): array
    {
        return [
            ['key' => 'ate-50', 'label' => 'Até 50 m²', 'min' => null, 'max' => 50.0],
            ['key' => '50-80', 'label' => '50 a 80 m²', 'min' => 50.0, 'max' => 80.0],
            ['key' => '80-120', 'label' => '80 a 120 m²', 'min' => 80.0, 'max' => 120.0],
            ['key' => '120-200', 'label' => '120 a 200 m²', 'min' => 120.0, 'max' => 200.0],
            ['key' => '200-350', 'label' => '200 a 350 m²', 'min' => 200.0, 'max' => 350.0],
            ['key' => 'acima-350', 'label' => 'Acima de 350 m²', 'min' => 350.0, 'max' => null],
        ];
    }

    /**
     * @return list<array{key: string, label: string, value: int, open_ended: bool}>
     */
    public static function bedrooms(): array
    {
        return self::countBuckets(5, 'quarto', 'quartos');
    }

    /**
     * @return list<array{key: string, label: string, value: int, open_ended: bool}>
     */
    public static function parkingSpaces(): array
    {
        return self::countBuckets(3, 'vaga', 'vagas');
    }

    /**
     * @param  list<array{key: string, label: string, min: float|null, max: float|null}>  $ranges
     */
    public static function bucketOf(?float $value, array $ranges): ?string
    {
        if ($value === null) {
            return null;
        }

        foreach ($ranges as $range) {
            $aboveMinimum = $range['min'] === null || $value >= $range['min'];
            $belowMaximum = $range['max'] === null || $value < $range['max'];

            if ($aboveMinimum && $belowMaximum) {
                return $range['key'];
            }
        }

        return null;
    }

    /**
     * @return list<array{key: string, label: string, value: int, open_ended: bool}>
     */
    private static function countBuckets(int $lastBucket, string $singular, string $plural): array
    {
        $buckets = [];

        for ($value = 0; $value <= $lastBucket; $value++) {
            $openEnded = $value === $lastBucket;
            $buckets[] = [
                'key' => $openEnded ? "{$value}+" : (string) $value,
                'label' => match (true) {
                    $openEnded => "{$value} ou mais",
                    $value === 1 => "1 {$singular}",
                    default => "{$value} {$plural}",
                },
                'value' => $value,
                'open_ended' => $openEnded,
            ];
        }

        return $buckets;
    }
}
