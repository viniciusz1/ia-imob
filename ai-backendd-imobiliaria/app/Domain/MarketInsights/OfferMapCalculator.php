<?php

namespace App\Domain\MarketInsights;

use App\Models\MarketProperty;
use Illuminate\Support\Collection;

final class OfferMapCalculator
{
    private const MIN_NEIGHBORHOOD_SAMPLE = 10;

    private const MIN_CITY_TYPE_SAMPLE = 10;

    private const ABOVE_THRESHOLD = 1.25;

    private const BELOW_THRESHOLD = 0.75;

    /**
     * @param  array<string, array{name: string, listings: array<int, MarketProperty>}>  $matchedNeighborhoods
     * @param  array<int, MarketProperty>  $unmappedListings
     * @param  array<int, PriceRange>  $priceRanges
     * @param  array<int, string>  $sources
     * @param  array<string, mixed>  $filters
     */
    public function calculate(
        OfferMapInput $input,
        array $matchedNeighborhoods,
        array $unmappedListings,
        array $priceRanges,
        array $sources,
        array $filters = [],
    ): CityOfferMap {
        $totalCount = array_sum(array_map(fn (array $group) => count($group['listings']), $matchedNeighborhoods));
        $totalCount += count($unmappedListings);

        $allListings = collect($unmappedListings);
        foreach ($matchedNeighborhoods as $group) {
            $allListings = $allListings->merge($group['listings']);
        }

        $cityTypeCounts = $allListings
            ->pluck('tipo')
            ->filter()
            ->countBy(fn (string $type) => CatalogKeyNormalizer::normalize($type))
            ->all();

        $neighborhoodMetrics = [];

        foreach ($matchedNeighborhoods as $key => $group) {
            $listings = collect($group['listings']);
            $metrics = $this->calculateNeighborhood($input, $listings, $totalCount, $priceRanges, $cityTypeCounts);

            $neighborhoodMetrics[] = new NeighborhoodMetrics(
                canonicalName: $group['name'],
                originalName: $this->resolveOriginalName($listings, $group['name']),
                count: $metrics['count'],
                citySharePercent: $metrics['city_share_percent'],
                predominantType: $metrics['predominant_type'],
                predominantPriceRange: $metrics['predominant_price_range'],
                medianPrice: $metrics['median_price'],
                p25Price: $metrics['p25_price'],
                p75Price: $metrics['p75_price'],
                typicalBedrooms: $metrics['typical_bedrooms'],
                typicalGarageSpaces: $metrics['typical_garage_spaces'],
                typicalArea: $metrics['typical_area'],
                concentration: $metrics['concentration'],
                sampleSize: $metrics['sample_size'],
                listings: $this->toListingSummaries($listings),
            );
        }

        return new CityOfferMap(
            city: $input->city,
            totalCount: $totalCount,
            neighborhoods: $neighborhoodMetrics,
            unmappedListings: $this->toListingSummaries(collect($unmappedListings)),
            priceRanges: $priceRanges,
            dataDate: $this->resolveDataDate(),
            sources: $sources,
            filters: $filters,
        );
    }

    /**
     * @param  Collection<int, MarketProperty>  $listings
     * @param  array<int, PriceRange>  $priceRanges
     * @param  array<string, int>  $cityTypeCounts
     * @return array<string, mixed>
     */
    private function calculateNeighborhood(OfferMapInput $input, Collection $listings, int $totalCount, array $priceRanges, array $cityTypeCounts): array
    {
        $count = $listings->count();
        $prices = $listings->pluck('valor')->filter(fn ($value) => is_numeric($value) && $value > 0)->sort()->values()->all();

        $sortedPrices = $this->sortNumeric($prices);
        $medianPrice = $this->percentile($sortedPrices, 0.5);
        $p25Price = $this->percentile($sortedPrices, 0.25);
        $p75Price = $this->percentile($sortedPrices, 0.75);

        return [
            'count' => $count,
            'city_share_percent' => $totalCount > 0 ? round(($count / $totalCount) * 100, 2) : 0.0,
            'predominant_type' => $this->mode($listings->pluck('tipo')->filter()->all()) ?? 'Misto',
            'predominant_price_range' => $this->predominantPriceRange($listings, $priceRanges),
            'median_price' => $medianPrice,
            'p25_price' => $p25Price,
            'p75_price' => $p75Price,
            'typical_bedrooms' => $this->mode($listings->pluck('quartos')->filter(fn ($value) => $value !== null)->all()),
            'typical_garage_spaces' => $this->mode($listings->pluck('vagas')->filter(fn ($value) => $value !== null)->all()),
            'typical_area' => $this->median($listings->pluck('area')->filter(fn ($value) => is_numeric($value) && $value > 0)->all()),
            'concentration' => $this->concentration($input, $listings, $totalCount, $cityTypeCounts),
            'sample_size' => $count,
        ];
    }

    /**
     * @param  array<int, float>  $values
     */
    private function percentile(array $values, float $percentile): ?float
    {
        $count = count($values);

        if ($count === 0) {
            return null;
        }

        $index = ($count - 1) * $percentile;
        $lower = (int) floor($index);
        $upper = (int) ceil($index);

        if ($lower === $upper) {
            return (float) $values[$lower];
        }

        $weight = $index - $lower;

        return ((float) $values[$lower] * (1 - $weight)) + ((float) $values[$upper] * $weight);
    }

    /**
     * @param  array<int, float>  $values
     */
    private function median(array $values): ?float
    {
        return $this->percentile($this->sortNumeric($values), 0.5);
    }

    /**
     * @param  array<int, float>  $values
     * @return array<int, float>
     */
    private function sortNumeric(array $values): array
    {
        sort($values);

        return array_values($values);
    }

    /**
     * @param  array<int, string|int|float>  $values
     */
    private function mode(array $values): string|int|float|null
    {
        if (empty($values)) {
            return null;
        }

        $frequencies = [];
        $allNumericIntegers = true;
        foreach ($values as $value) {
            $key = (string) $value;
            $frequencies[$key] = ($frequencies[$key] ?? 0) + 1;

            if (! is_int($value)) {
                $allNumericIntegers = false;
            }
        }

        arsort($frequencies);
        $maxFrequency = reset($frequencies);
        $topValues = array_filter($frequencies, fn ($frequency) => $frequency === $maxFrequency);

        if (count($topValues) > 1) {
            return 'Misto';
        }

        $mode = array_key_first($topValues);

        if ($allNumericIntegers && is_numeric($mode)) {
            return (int) $mode;
        }

        return is_numeric($mode) ? (string) $mode : $mode;
    }

    /**
     * @param  Collection<int, MarketProperty>  $listings
     * @param  array<int, PriceRange>  $priceRanges
     */
    private function predominantPriceRange(Collection $listings, array $priceRanges): ?string
    {
        if (empty($priceRanges)) {
            return null;
        }

        $counts = [];
        foreach ($priceRanges as $index => $range) {
            $counts[$index] = $listings->filter(fn (MarketProperty $listing) => is_numeric($listing->valor) && $range->contains((float) $listing->valor))->count();
        }

        arsort($counts);
        $maxCount = reset($counts);

        if ($maxCount === 0) {
            return null;
        }

        $topIndices = array_filter($counts, fn ($count) => $count === $maxCount);

        if (count($topIndices) > 1) {
            return 'Misto';
        }

        return $priceRanges[array_key_first($topIndices)]->label;
    }

    /**
     * @param  Collection<int, MarketProperty>  $listings
     * @param  array<string, int>  $cityTypeCounts
     * @return array<string, mixed>|null
     */
    private function concentration(OfferMapInput $input, Collection $listings, int $totalCount, array $cityTypeCounts): ?array
    {
        $type = $input->concentrationType ?? $this->mode($listings->pluck('tipo')->filter()->all());

        if ($type === null || $type === 'Misto') {
            return null;
        }

        $neighborhoodCount = $listings->where('tipo', $type)->count();
        $neighborhoodTotal = $listings->count();
        $cityTypeCount = $cityTypeCounts[CatalogKeyNormalizer::normalize($type)] ?? 0;

        if ($neighborhoodTotal < self::MIN_NEIGHBORHOOD_SAMPLE || $cityTypeCount < self::MIN_CITY_TYPE_SAMPLE) {
            return [
                'type' => $type,
                'level' => ConcentrationLevel::InsufficientSample->value,
                'ratio' => null,
            ];
        }

        $neighborhoodShare = $neighborhoodTotal > 0 ? $neighborhoodCount / $neighborhoodTotal : 0;
        $cityShare = $totalCount > 0 ? $cityTypeCount / $totalCount : 0;

        if ($cityShare <= 0) {
            return [
                'type' => $type,
                'level' => ConcentrationLevel::InsufficientSample->value,
                'ratio' => null,
            ];
        }

        $ratio = round($neighborhoodShare / $cityShare, 2);

        $level = match (true) {
            $ratio >= self::ABOVE_THRESHOLD => ConcentrationLevel::Above->value,
            $ratio <= self::BELOW_THRESHOLD => ConcentrationLevel::Below->value,
            default => ConcentrationLevel::Neutral->value,
        };

        return [
            'type' => $type,
            'level' => $level,
            'ratio' => $ratio,
        ];
    }

    /**
     * @param  Collection<int, MarketProperty>  $listings
     */
    private function resolveOriginalName(Collection $listings, string $canonicalName): string
    {
        $first = $listings->first();

        return $first ? (string) $first->bairro : $canonicalName;
    }

    /**
     * @param  Collection<int, MarketProperty>  $listings
     * @return array<int, array<string, mixed>>
     */
    private function toListingSummaries(Collection $listings): array
    {
        return $listings->map(fn (MarketProperty $listing) => [
            'id' => $listing->id,
            'tipo' => $listing->tipo,
            'imobiliaria' => $listing->imobiliaria,
            'valor' => $listing->valor,
            'bairro' => $listing->bairro,
            'cidade' => $listing->cidade,
            'quartos' => $listing->quartos,
            'vagas' => $listing->vagas,
            'area' => $listing->area,
            'link' => $listing->link_imovel,
            'imagem' => $listing->imagem,
        ])->all();
    }

    private function resolveDataDate(): ?string
    {
        return now()->toIso8601String();
    }
}
