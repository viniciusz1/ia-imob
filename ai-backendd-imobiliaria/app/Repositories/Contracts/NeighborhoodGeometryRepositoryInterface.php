<?php

namespace App\Repositories\Contracts;

use App\Models\Crawler\City;

interface NeighborhoodGeometryRepositoryInterface
{
    /**
     * @return array{
     *     available: bool,
     *     version: string|null,
     *     source: array{name: string, license: string, url: string}|null,
     *     features: array<int, array<string, mixed>>
     * }
     */
    public function forCity(City $city): array;
}
