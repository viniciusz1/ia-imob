<?php

namespace App\Services\Overpass;

use App\Models\NeighborhoodReferencePoint;
use App\Models\PointOfInterest;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class ProximityResolver
{
    public function resolve(array $proximity, ?string $contextCity = null): ?array
    {
        $reference = trim((string) ($proximity['reference'] ?? ''));
        $city = trim((string) ($proximity['city'] ?? $contextCity ?? config('overpass.default_city')));
        $state = Str::upper((string) config('overpass.default_state', 'SC'));

        if ($reference === '' || $city === '') {
            return null;
        }

        $radiusHint = (string) ($proximity['radius_hint'] ?? 'perto');
        $radiusMeters = $this->radiusMeters($radiusHint);
        $match = $this->matchNeighborhood($reference, $city, $state)
            ?? $this->matchPoi($reference, $city, $state);

        if ($match === null) {
            return null;
        }

        $nearby = $this->nearbyNeighborhoods((float) $match['lat'], (float) $match['lng'], $city, $state, $radiusMeters);
        $approximate = false;

        if ($nearby->isEmpty()) {
            $nearby = $this->nearestNeighborhoods((float) $match['lat'], (float) $match['lng'], $city, $state);
            $approximate = $nearby->isNotEmpty();
        }

        return [
            'proximity' => array_filter([
                'reference' => $reference,
                'city' => $city,
                'radius_hint' => $radiusHint,
                'resolved' => $nearby->isNotEmpty(),
                'matched_name' => $match['name'],
                'source' => $match['source'],
                'lat' => $match['lat'],
                'lng' => $match['lng'],
                'radius_meters' => $radiusMeters,
                'approximate' => $approximate ?: null,
            ], fn ($value) => $value !== null && $value !== ''),
            'locations' => $nearby
                ->map(fn (NeighborhoodReferencePoint $neighborhood) => [
                    'bairro' => $neighborhood->name,
                    'cidade' => $neighborhood->city,
                ])
                ->values()
                ->all(),
        ];
    }

    public function normalizeNeighborhoodName(string $neighborhood, ?string $city = null): string
    {
        $city = trim((string) ($city ?: config('overpass.default_city')));
        $state = Str::upper((string) config('overpass.default_state', 'SC'));
        $match = $this->matchNeighborhood($neighborhood, $city, $state);

        return $match['name'] ?? trim($neighborhood);
    }

    private function matchNeighborhood(string $reference, string $city, string $state): ?array
    {
        $referenceKey = $this->normalize($reference);

        return $this->neighborhoodsForCity($city, $state)
            ->map(fn (NeighborhoodReferencePoint $neighborhood) => [
                'model' => $neighborhood,
                'score' => $this->score($referenceKey, $neighborhood),
            ])
            ->filter(fn (array $candidate) => $candidate['score'] > 0)
            ->sortByDesc('score')
            ->map(fn (array $candidate) => $this->matchArray($candidate['model'], 'neighborhood'))
            ->first();
    }

    private function matchPoi(string $reference, string $city, string $state): ?array
    {
        $referenceKey = $this->normalize($reference);

        return $this->poisForCity($city, $state)
            ->map(fn (PointOfInterest $poi) => [
                'model' => $poi,
                'score' => $this->score($referenceKey, $poi),
            ])
            ->filter(fn (array $candidate) => $candidate['score'] > 0)
            ->sortByDesc('score')
            ->map(fn (array $candidate) => $this->matchArray($candidate['model'], 'poi'))
            ->first();
    }

    private function score(string $referenceKey, Model $model): int
    {
        $name = $this->normalize((string) $model->getAttribute('name'));
        $aliases = array_map(
            fn ($alias) => $this->normalize((string) $alias),
            (array) $model->getAttribute('aliases')
        );

        if ($referenceKey === $name || in_array($referenceKey, $aliases, true)) {
            return 100;
        }

        foreach (array_merge([$name], $aliases) as $candidate) {
            if (strlen($referenceKey) >= 3 && str_contains($candidate, $referenceKey)) {
                return 80;
            }

            if (strlen($candidate) >= 4 && str_contains($referenceKey, $candidate)) {
                return 70;
            }
        }

        return 0;
    }

    private function nearbyNeighborhoods(float $lat, float $lng, string $city, string $state, int $radiusMeters): Collection
    {
        return $this->neighborhoodsForCity($city, $state)
            ->map(function (NeighborhoodReferencePoint $neighborhood) use ($lat, $lng) {
                $neighborhood->distance_meters = $this->distanceMeters(
                    $lat,
                    $lng,
                    (float) $neighborhood->lat,
                    (float) $neighborhood->lng
                );

                return $neighborhood;
            })
            ->filter(fn (NeighborhoodReferencePoint $neighborhood) => $neighborhood->distance_meters <= $radiusMeters)
            ->sortBy('distance_meters')
            ->values();
    }

    private function nearestNeighborhoods(float $lat, float $lng, string $city, string $state): Collection
    {
        return $this->neighborhoodsForCity($city, $state)
            ->map(function (NeighborhoodReferencePoint $neighborhood) use ($lat, $lng) {
                $neighborhood->distance_meters = $this->distanceMeters(
                    $lat,
                    $lng,
                    (float) $neighborhood->lat,
                    (float) $neighborhood->lng
                );

                return $neighborhood;
            })
            ->sortBy('distance_meters')
            ->take((int) config('overpass.fallback_neighborhood_count', 3))
            ->values();
    }

    private function neighborhoodsForCity(string $city, string $state): Collection
    {
        return NeighborhoodReferencePoint::query()
            ->where('state', Str::upper($state))
            ->get()
            ->filter(fn (NeighborhoodReferencePoint $point) => $this->normalize($point->city) === $this->normalize($city))
            ->values();
    }

    private function poisForCity(string $city, string $state): Collection
    {
        return PointOfInterest::query()
            ->where('state', Str::upper($state))
            ->get()
            ->filter(fn (PointOfInterest $point) => $this->normalize($point->city) === $this->normalize($city))
            ->values();
    }

    private function matchArray(Model $model, string $source): array
    {
        return [
            'name' => (string) $model->getAttribute('name'),
            'source' => $source,
            'lat' => (float) $model->getAttribute('lat'),
            'lng' => (float) $model->getAttribute('lng'),
        ];
    }

    private function radiusMeters(string $hint): int
    {
        return (int) (config("overpass.radius_meters.$hint") ?: config('overpass.radius_meters.perto', 2000));
    }

    private function distanceMeters(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthRadius = 6371000;
        $deltaLat = deg2rad($lat2 - $lat1);
        $deltaLng = deg2rad($lng2 - $lng1);

        $a = sin($deltaLat / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($deltaLng / 2) ** 2;

        return 2 * $earthRadius * atan2(sqrt($a), sqrt(1 - $a));
    }

    private function normalize(string $value): string
    {
        return Str::of($value)
            ->ascii()
            ->lower()
            ->replaceMatches('/[^a-z0-9]+/', ' ')
            ->squish()
            ->toString();
    }
}
