<?php

namespace App\Repositories\Contracts;

use Illuminate\Support\Collection;

interface MarketPropertyRepositoryInterface
{
    /**
     * @param  array<string, mixed>  $filters
     * @return Collection<int, \App\Models\MarketProperty>
     */
    public function latestValidListingsForCity(string $city, array $filters = []): Collection;
}
