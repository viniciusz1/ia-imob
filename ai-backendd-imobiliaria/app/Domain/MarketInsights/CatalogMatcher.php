<?php

namespace App\Domain\MarketInsights;

use App\Models\Crawler\City;
use App\Models\Crawler\Neighborhood;
use App\Models\Crawler\PropertyType;
use App\Models\MarketProperty;
use Illuminate\Support\Collection;

final class CatalogMatcher
{
    /**
     * @param  Collection<int, Neighborhood>  $neighborhoods
     * @param  Collection<int, PropertyType>  $propertyTypes
     * @return array{
     *     neighborhoods: array<string, array{name: string, listings: array<int, MarketProperty>}>,
     *     unmapped: array<int, MarketProperty>
     * }
     */
    public function match(Collection $listings, City $city, Collection $neighborhoods, Collection $propertyTypes): array
    {
        $neighborhoodIndex = $this->buildNeighborhoodIndex($city, $neighborhoods);
        $typeIndex = $this->buildTypeIndex($propertyTypes);

        $matched = [];
        $unmapped = [];

        foreach ($listings as $listing) {
            $listing = $this->withCanonicalType($listing, $typeIndex);
            $neighborhoodKey = $this->matchNeighborhood($listing, $city, $neighborhoodIndex);

            if ($neighborhoodKey === null) {
                $unmapped[] = $listing;

                continue;
            }

            if (! isset($matched[$neighborhoodKey])) {
                $matched[$neighborhoodKey] = [
                    'name' => $neighborhoodIndex[$neighborhoodKey]['name'],
                    'listings' => [],
                ];
            }

            $matched[$neighborhoodKey]['listings'][] = $listing;
        }

        return [
            'neighborhoods' => $matched,
            'unmapped' => $unmapped,
        ];
    }

    /**
     * @param  Collection<int, Neighborhood>  $neighborhoods
     * @return array<string, array{name: string, listing: Neighborhood}>
     */
    private function buildNeighborhoodIndex(City $city, Collection $neighborhoods): array
    {
        $index = [];
        $citySlug = CatalogKeyNormalizer::normalize($city->slug);

        foreach ($neighborhoods as $neighborhood) {
            $baseKey = $citySlug.':'.CatalogKeyNormalizer::normalize($neighborhood->slug);
            $index[$baseKey] = [
                'name' => $neighborhood->name,
                'listing' => $neighborhood,
            ];

            $nameKey = $citySlug.':'.CatalogKeyNormalizer::normalize($neighborhood->name);
            $index[$nameKey] = [
                'name' => $neighborhood->name,
                'listing' => $neighborhood,
            ];

            foreach ($neighborhood->aliases ?? [] as $alias) {
                $aliasKey = $citySlug.':'.CatalogKeyNormalizer::normalize($alias);
                $index[$aliasKey] = [
                    'name' => $neighborhood->name,
                    'listing' => $neighborhood,
                ];
            }
        }

        return $index;
    }

    /**
     * @param  Collection<int, PropertyType>  $propertyTypes
     * @return array<string, string>
     */
    private function buildTypeIndex(Collection $propertyTypes): array
    {
        $index = [];

        foreach ($propertyTypes as $type) {
            $index[CatalogKeyNormalizer::normalize($type->slug)] = $type->name;
            $index[CatalogKeyNormalizer::normalize($type->name)] = $type->name;

            foreach ($type->aliases ?? [] as $alias) {
                $index[CatalogKeyNormalizer::normalize($alias)] = $type->name;
            }
        }

        return $index;
    }

    /**
     * @param  array<string, array{name: string, listing: Neighborhood}>  $neighborhoodIndex
     */
    private function matchNeighborhood(MarketProperty $listing, City $city, array $neighborhoodIndex): ?string
    {
        $citySlug = CatalogKeyNormalizer::normalize($city->slug);
        $rawNeighborhood = trim((string) $listing->bairro);

        if ($rawNeighborhood === '') {
            return null;
        }

        $key = $citySlug.':'.CatalogKeyNormalizer::normalize($rawNeighborhood);

        return isset($neighborhoodIndex[$key]) ? $key : null;
    }

    /**
     * @param  array<string, string>  $typeIndex
     */
    private function withCanonicalType(MarketProperty $listing, array $typeIndex): MarketProperty
    {
        $rawType = trim((string) $listing->tipo);

        if ($rawType === '') {
            return $listing;
        }

        $key = CatalogKeyNormalizer::normalize($rawType);

        if (isset($typeIndex[$key])) {
            $listing->tipo = $typeIndex[$key];
        }

        return $listing;
    }
}
