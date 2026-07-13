<?php

namespace App\Repositories;

use App\Domain\MarketInsights\CatalogKeyNormalizer;
use App\Models\Crawler\City;
use App\Models\MarketProperty;
use App\Repositories\Contracts\MarketPropertyRepositoryInterface;
use Illuminate\Support\Collection;

class MarketPropertyRepository implements MarketPropertyRepositoryInterface
{
    /**
     * {@inheritDoc}
     */
    public function latestValidListingsForCity(string $city, array $filters = []): Collection
    {
        $canonicalCity = $this->resolveCity($city);

        if ($canonicalCity === null) {
            return collect();
        }

        $query = MarketProperty::query()
            ->latestRun()
            ->where('quality_status', 'valid')
            ->whereRaw('f_unaccent(cidade) ILIKE f_unaccent(?)', [$canonicalCity->name]);

        $query->applyFilters($filters);

        $listings = $query->get();

        return $this->deduplicateBySourceUrl($listings);
    }

    private function resolveCity(string $city): ?City
    {
        $normalized = CatalogKeyNormalizer::normalize($city);

        return City::query()
            ->whereRaw('slug = ?', [$normalized])
            ->orWhereRaw('f_unaccent(name) ILIKE f_unaccent(?)', [$city])
            ->first();
    }

    /**
     * @param  Collection<int, MarketProperty>  $listings
     * @return Collection<int, MarketProperty>
     */
    private function deduplicateBySourceUrl(Collection $listings): Collection
    {
        $seen = [];

        return $listings->filter(function (MarketProperty $listing) use (&$seen) {
            $sourceName = $listing->crawlerRun?->source_name ?? '';
            $key = $sourceName.'|'.((string) $listing->link_imovel);

            if (isset($seen[$key])) {
                return false;
            }

            $seen[$key] = true;

            return true;
        })->values();
    }
}
