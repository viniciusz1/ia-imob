<?php

namespace App\Repositories;

use App\Models\Crawler\City;
use App\Repositories\Contracts\NeighborhoodGeometryRepositoryInterface;
use JsonException;
use RuntimeException;

class NeighborhoodGeometryRepository implements NeighborhoodGeometryRepositoryInterface
{
    public function forCity(City $city): array
    {
        $pattern = resource_path(sprintf(
            'market-insights/geometries/%s-%s.v*.geojson',
            $city->slug,
            strtolower($city->state),
        ));
        $files = glob($pattern) ?: [];
        natsort($files);
        $path = end($files);

        if ($path === false) {
            return $this->unavailable();
        }

        try {
            $payload = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            throw new RuntimeException("Invalid neighborhood geometry file [{$path}].", previous: $exception);
        }

        if (($payload['type'] ?? null) !== 'FeatureCollection' || ! is_array($payload['features'] ?? null)) {
            throw new RuntimeException("Neighborhood geometry file [{$path}] must be a GeoJSON FeatureCollection.");
        }

        $features = array_values(array_filter(
            $payload['features'],
            fn ($feature) => is_array($feature)
                && is_string(data_get($feature, 'properties.name'))
                && in_array(data_get($feature, 'geometry.type'), ['Polygon', 'MultiPolygon'], true)
        ));

        $source = $payload['source'] ?? null;

        return [
            'available' => $features !== [],
            'version' => is_string($payload['version'] ?? null) ? $payload['version'] : basename($path),
            'source' => is_array($source) ? [
                'name' => (string) ($source['name'] ?? ''),
                'license' => (string) ($source['license'] ?? ''),
                'url' => (string) ($source['url'] ?? ''),
            ] : null,
            'features' => $features,
        ];
    }

    /**
     * @return array{available: false, version: null, source: null, features: array<int, never>}
     */
    private function unavailable(): array
    {
        return [
            'available' => false,
            'version' => null,
            'source' => null,
            'features' => [],
        ];
    }
}
