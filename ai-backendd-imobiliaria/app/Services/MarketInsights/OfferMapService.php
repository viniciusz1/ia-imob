<?php

namespace App\Services\MarketInsights;

use App\Domain\MarketInsights\CatalogKeyNormalizer;
use App\Domain\MarketInsights\CatalogMatcher;
use App\Domain\MarketInsights\OfferMapCalculator;
use App\Domain\MarketInsights\OfferMapInput;
use App\Domain\MarketInsights\PriceRange;
use App\Repositories\Contracts\CatalogRepositoryInterface;
use App\Repositories\Contracts\MarketPropertyRepositoryInterface;
use App\Repositories\Contracts\NeighborhoodGeometryRepositoryInterface;
use Illuminate\Support\Collection;

class OfferMapService
{
    public function __construct(
        private MarketPropertyRepositoryInterface $marketPropertyRepository,
        private CatalogRepositoryInterface $catalogRepository,
        private NeighborhoodGeometryRepositoryInterface $geometryRepository,
        private CatalogMatcher $catalogMatcher,
        private OfferMapCalculator $calculator,
    ) {}

    /**
     * @param  array<string, mixed>  $filters
     */
    public function buildMap(string $city, array $filters = [], string $layer = 'stock', ?string $concentrationType = null): array
    {
        $canonicalCity = $this->catalogRepository->findCityByName($city);

        if ($canonicalCity === null) {
            $input = new OfferMapInput(
                city: $city,
                filters: $filters,
                layer: $layer,
                concentrationType: $concentrationType,
            );

            return $this->emptyMap($input, $filters);
        }

        $input = new OfferMapInput(
            city: $canonicalCity->name,
            filters: $filters,
            layer: $layer,
            concentrationType: $concentrationType,
        );

        $catalog = $this->catalogRepository->getCityCatalog($canonicalCity);
        $queryFilters = $filters;
        unset($queryFilters['tipo']);
        $listings = $this->marketPropertyRepository->latestValidListingsForCity($canonicalCity->name, $queryFilters);

        $matchResult = $this->catalogMatcher->match(
            $listings,
            $catalog['city'],
            $catalog['neighborhoods'],
            $catalog['propertyTypes'],
        );
        $matchResult = $this->filterByCanonicalTypes($matchResult, $filters['tipo'] ?? []);
        $filteredListings = $this->collectMatchedListings($matchResult);
        $geometry = $this->geometryRepository->forCity($canonicalCity);
        $mapping = $this->mappingCoverage($matchResult, $geometry);

        $priceRanges = $this->defaultPriceRanges();

        $map = $this->calculator->calculate(
            input: $input,
            matchedNeighborhoods: $matchResult['neighborhoods'],
            unmappedListings: $matchResult['unmapped'],
            priceRanges: $priceRanges,
            sources: $filteredListings->pluck('crawlerRun.source_name')->filter()->unique()->values()->all(),
            filters: $filters,
            dataDate: $this->resolveDataDate($filteredListings),
        );

        return $this->toArray(
            map: $map,
            geometry: $geometry,
            unmappedListings: $mapping['unmapped'],
            mappedCount: $mapping['mappedCount'],
        );
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    private function emptyMap(OfferMapInput $input, array $filters): array
    {
        $map = $this->calculator->calculate(
            input: $input,
            matchedNeighborhoods: [],
            unmappedListings: [],
            priceRanges: $this->defaultPriceRanges(),
            sources: [],
            filters: $filters,
            dataDate: null,
        );

        return $this->toArray(
            map: $map,
            geometry: $this->unavailableGeometry(),
            unmappedListings: collect(),
            mappedCount: 0,
        );
    }

    /**
     * @return array<int, PriceRange>
     */
    private function defaultPriceRanges(): array
    {
        return [
            new PriceRange('Até R$ 200 mil', null, 200000),
            new PriceRange('R$ 200 mil - 400 mil', 200000, 400000),
            new PriceRange('R$ 400 mil - 600 mil', 400000, 600000),
            new PriceRange('R$ 600 mil - 1 milhão', 600000, 1000000),
            new PriceRange('Acima de R$ 1 milhão', 1000000, null),
        ];
    }

    /**
     * @param  array{
     *     available: bool,
     *     version: string|null,
     *     source: array{name: string, license: string, url: string}|null,
     *     features: array<int, array<string, mixed>>
     * }  $geometry
     * @param  Collection<int, \App\Models\MarketProperty>  $unmappedListings
     */
    private function toArray(
        \App\Domain\MarketInsights\CityOfferMap $map,
        array $geometry,
        Collection $unmappedListings,
        int $mappedCount,
    ): array {
        $coveragePercent = $map->totalCount > 0
            ? round(($mappedCount / $map->totalCount) * 100, 2)
            : 0.0;
        $mappedNeighborhoodNames = collect($geometry['features'])
            ->pluck('properties.name')
            ->filter()
            ->mapWithKeys(fn (string $name) => [CatalogKeyNormalizer::normalize($name) => true])
            ->all();

        return [
            'city' => $map->city,
            'total_count' => $map->totalCount,
            'neighborhoods' => array_map(fn ($neighborhood) => [
                'name' => $neighborhood->canonicalName,
                'original_name' => $neighborhood->originalName,
                'count' => $neighborhood->count,
                'city_share_percent' => $neighborhood->citySharePercent,
                'predominant_type' => $neighborhood->predominantType,
                'predominant_price_range' => $neighborhood->predominantPriceRange,
                'median_price' => $neighborhood->medianPrice,
                'p25_price' => $neighborhood->p25Price,
                'p75_price' => $neighborhood->p75Price,
                'typical_bedrooms' => $neighborhood->typicalBedrooms,
                'typical_garage_spaces' => $neighborhood->typicalGarageSpaces,
                'typical_area' => $neighborhood->typicalArea,
                'type_distribution' => $neighborhood->typeDistribution,
                'sample_quality' => $neighborhood->sampleQuality,
                'concentration' => $neighborhood->concentration,
                'sample_size' => $neighborhood->sampleSize,
                'has_geometry' => isset($mappedNeighborhoodNames[CatalogKeyNormalizer::normalize($neighborhood->canonicalName)]),
                'listings' => $neighborhood->listings,
            ], $map->neighborhoods),
            'unmapped_listings' => $this->toListingSummaries($unmappedListings),
            'price_ranges' => array_map(fn ($range) => [
                'label' => $range->label,
                'min' => $range->min,
                'max' => $range->max,
            ], $map->priceRanges),
            'data_date' => $map->dataDate,
            'sources' => $map->sources,
            'coverage' => [
                'mapped_count' => $mappedCount,
                'total_count' => $map->totalCount,
                'percent' => $coveragePercent,
            ],
            'confidence' => [
                'level' => $this->confidenceLevel($map->totalCount, $coveragePercent),
                'minimum_sample_size' => 10,
            ],
            'geometry' => $geometry,
            'filters' => $map->filters,
        ];
    }

    /**
     * @param  array{
     *     neighborhoods: array<string, array{name: string, listings: array<int, \App\Models\MarketProperty>}>,
     *     unmapped: array<int, \App\Models\MarketProperty>
     * }  $matchResult
     * @param  array<int, string>  $types
     * @return array{
     *     neighborhoods: array<string, array{name: string, listings: array<int, \App\Models\MarketProperty>}>,
     *     unmapped: array<int, \App\Models\MarketProperty>
     * }
     */
    private function filterByCanonicalTypes(array $matchResult, array $types): array
    {
        $normalizedTypes = collect($types)
            ->filter(fn ($type) => is_string($type) && trim($type) !== '')
            ->map(fn (string $type) => CatalogKeyNormalizer::normalize($type))
            ->all();

        if ($normalizedTypes === []) {
            return $matchResult;
        }

        foreach ($matchResult['neighborhoods'] as $key => $group) {
            $listings = collect($group['listings'])
                ->filter(fn ($listing) => in_array(CatalogKeyNormalizer::normalize((string) $listing->tipo), $normalizedTypes, true))
                ->values()
                ->all();

            if ($listings === []) {
                unset($matchResult['neighborhoods'][$key]);

                continue;
            }

            $matchResult['neighborhoods'][$key]['listings'] = $listings;
        }

        $matchResult['unmapped'] = collect($matchResult['unmapped'])
            ->filter(fn ($listing) => in_array(CatalogKeyNormalizer::normalize((string) $listing->tipo), $normalizedTypes, true))
            ->values()
            ->all();

        return $matchResult;
    }

    /**
     * @param  array{
     *     neighborhoods: array<string, array{name: string, listings: array<int, \App\Models\MarketProperty>}>,
     *     unmapped: array<int, \App\Models\MarketProperty>
     * }  $matchResult
     * @return Collection<int, \App\Models\MarketProperty>
     */
    private function collectMatchedListings(array $matchResult): Collection
    {
        $listings = collect($matchResult['unmapped']);

        foreach ($matchResult['neighborhoods'] as $group) {
            $listings = $listings->concat($group['listings']);
        }

        return $listings->values();
    }

    /**
     * @param  array{
     *     neighborhoods: array<string, array{name: string, listings: array<int, \App\Models\MarketProperty>}>,
     *     unmapped: array<int, \App\Models\MarketProperty>
     * }  $matchResult
     * @param  array{available: bool, features: array<int, array<string, mixed>>}  $geometry
     * @return array{mappedCount: int, unmapped: Collection<int, \App\Models\MarketProperty>}
     */
    private function mappingCoverage(array $matchResult, array $geometry): array
    {
        $geometryNames = collect($geometry['features'])
            ->pluck('properties.name')
            ->filter()
            ->mapWithKeys(fn (string $name) => [CatalogKeyNormalizer::normalize($name) => true])
            ->all();
        $unmapped = collect($matchResult['unmapped']);
        $mappedCount = 0;

        foreach ($matchResult['neighborhoods'] as $group) {
            if ($geometry['available'] && isset($geometryNames[CatalogKeyNormalizer::normalize($group['name'])])) {
                $mappedCount += count($group['listings']);

                continue;
            }

            $unmapped = $unmapped->concat($group['listings']);
        }

        return [
            'mappedCount' => $mappedCount,
            'unmapped' => $unmapped->values(),
        ];
    }

    /**
     * @param  Collection<int, \App\Models\MarketProperty>  $listings
     */
    private function resolveDataDate(Collection $listings): ?string
    {
        $completedAt = $listings
            ->pluck('crawlerRun.completed_at')
            ->filter()
            ->sortDesc()
            ->first();

        return $completedAt?->toIso8601String();
    }

    private function confidenceLevel(int $sampleSize, float $coveragePercent): string
    {
        if ($sampleSize < 10) {
            return 'insufficient_sample';
        }

        return $coveragePercent < 80 ? 'low_coverage' : 'adequate';
    }

    /**
     * @param  Collection<int, \App\Models\MarketProperty>  $listings
     * @return array<int, array<string, mixed>>
     */
    private function toListingSummaries(Collection $listings): array
    {
        return $listings->map(fn ($listing) => [
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

    /**
     * @return array{available: false, version: null, source: null, features: array<int, never>}
     */
    private function unavailableGeometry(): array
    {
        return [
            'available' => false,
            'version' => null,
            'source' => null,
            'features' => [],
        ];
    }
}
