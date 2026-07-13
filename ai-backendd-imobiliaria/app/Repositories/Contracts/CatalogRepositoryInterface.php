<?php

namespace App\Repositories\Contracts;

use App\Models\Crawler\City;
use Illuminate\Support\Collection;

interface CatalogRepositoryInterface
{
    public function findCityByName(string $name): ?City;

    /**
     * @return array{
     *     city: City,
     *     neighborhoods: Collection<int, \App\Models\Crawler\Neighborhood>,
     *     propertyTypes: Collection<int, \App\Models\Crawler\PropertyType>
     * }
     */
    public function getCityCatalog(City $city): array;
}
