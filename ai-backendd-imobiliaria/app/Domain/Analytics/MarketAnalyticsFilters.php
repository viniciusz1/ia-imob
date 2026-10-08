<?php

namespace App\Domain\Analytics;

use Carbon\CarbonImmutable;

final class MarketAnalyticsFilters
{
    public const TIMEZONE = 'America/Sao_Paulo';

    /**
     * @param  list<string>  $neighbourhoods
     * @param  list<string>  $types
     * @param  list<string>  $agencies
     * @param  list<int>  $bedrooms
     * @param  list<int>  $parkingSpaces
     */
    public function __construct(
        public readonly ?CarbonImmutable $from = null,
        public readonly ?CarbonImmutable $to = null,
        public readonly ?string $city = null,
        public readonly array $neighbourhoods = [],
        public readonly array $types = [],
        public readonly array $agencies = [],
        public readonly array $bedrooms = [],
        public readonly array $parkingSpaces = [],
        public readonly ?float $minPrice = null,
        public readonly ?float $maxPrice = null,
        public readonly ?float $minArea = null,
        public readonly ?float $maxArea = null,
    ) {}

    /**
     * @param  array<string, mixed>  $input
     */
    public static function fromArray(array $input): self
    {
        return new self(
            from: self::date($input['data_inicio'] ?? null),
            to: self::date($input['data_fim'] ?? null),
            city: self::text($input['cidade'] ?? null),
            neighbourhoods: self::textList($input['bairro'] ?? []),
            types: self::textList($input['tipo'] ?? []),
            agencies: self::textList($input['imobiliaria'] ?? []),
            bedrooms: self::intList($input['quartos'] ?? []),
            parkingSpaces: self::intList($input['vagas'] ?? []),
            minPrice: self::number($input['min'] ?? null),
            maxPrice: self::number($input['max'] ?? null),
            minArea: self::number($input['area_min'] ?? null),
            maxArea: self::number($input['area_max'] ?? null),
        );
    }

    public function signature(): string
    {
        return sha1(serialize([
            $this->from?->toDateString(),
            $this->to?->toDateString(),
            $this->city,
            $this->neighbourhoods,
            $this->types,
            $this->agencies,
            $this->bedrooms,
            $this->parkingSpaces,
            $this->minPrice,
            $this->maxPrice,
            $this->minArea,
            $this->maxArea,
        ]));
    }

    private static function date(mixed $value): ?CarbonImmutable
    {
        $text = self::text($value);

        return $text === null
            ? null
            : CarbonImmutable::parse($text, self::TIMEZONE);
    }

    private static function text(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $trimmed = trim($value);

        return $trimmed === '' ? null : $trimmed;
    }

    /**
     * @return list<string>
     */
    private static function textList(mixed $value): array
    {
        $values = array_map(
            static fn (mixed $item): ?string => self::text($item),
            is_array($value) ? array_values($value) : [$value],
        );

        return array_values(array_unique(array_filter(
            $values,
            static fn (?string $item): bool => $item !== null,
        )));
    }

    /**
     * @return list<int>
     */
    private static function intList(mixed $value): array
    {
        $values = is_array($value) ? array_values($value) : [$value];
        $integers = [];

        foreach ($values as $item) {
            if (is_numeric($item)) {
                $integers[] = (int) $item;
            }
        }

        sort($integers);

        return array_values(array_unique($integers));
    }

    private static function number(mixed $value): ?float
    {
        return is_numeric($value) ? (float) $value : null;
    }
}
