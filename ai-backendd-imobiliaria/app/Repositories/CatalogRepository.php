<?php

namespace App\Repositories;

use App\Domain\MarketInsights\CatalogKeyNormalizer;
use App\Models\Crawler\City;
use App\Models\Crawler\Neighborhood;
use App\Models\Crawler\PropertyType;
use App\Repositories\Contracts\CatalogRepositoryInterface;

class CatalogRepository implements CatalogRepositoryInterface
{
    public function findCityByName(string $name): ?City
    {
        $normalized = CatalogKeyNormalizer::normalize($name);

        return City::query()
            ->where('slug', $normalized)
            ->orWhereRaw('f_unaccent(name) ILIKE f_unaccent(?)', [$name])
            ->first();
    }

    /**
     * {@inheritDoc}
     */
    public function getCityCatalog(City $city): array
    {
        return [
            'city' => $city,
            'neighborhoods' => Neighborhood::query()->where('city_id', $city->id)->get(),
            'propertyTypes' => PropertyType::query()->get(),
        ];
    }
}
