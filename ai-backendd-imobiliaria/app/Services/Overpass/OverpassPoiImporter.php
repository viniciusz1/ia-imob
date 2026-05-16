<?php

namespace App\Services\Overpass;

use App\Models\NeighborhoodReferencePoint;
use App\Models\PointOfInterest;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;

class OverpassPoiImporter
{
    public function __construct(
        private readonly OverpassClient $client,
    ) {}

    public function import(string $city, string $state): array
    {
        $payload = $this->client->fetch($this->buildQuery($city, $state));
        $elements = Arr::get($payload, 'elements', []);

        if (!is_array($elements)) {
            throw new \RuntimeException('Overpass API payload is missing the elements array.');
        }

        $summary = [
            'pois' => 0,
            'neighborhoods' => 0,
            'skipped' => 0,
        ];

        foreach ($elements as $element) {
            if (!is_array($element)) {
                $summary['skipped']++;
                continue;
            }

            $tags = Arr::get($element, 'tags', []);
            $name = trim((string) ($tags['name'] ?? $tags['official_name'] ?? ''));
            $point = $this->extractPoint($element);

            if ($name === '' || $point === null) {
                $summary['skipped']++;
                continue;
            }

            if ($this->isNeighborhood($tags)) {
                NeighborhoodReferencePoint::updateOrCreate(
                    [
                        'name' => $name,
                        'city' => $city,
                        'state' => Str::upper($state),
                    ],
                    [
                        'osm_type' => (string) ($element['type'] ?? ''),
                        'osm_id' => (int) ($element['id'] ?? 0),
                        'lat' => $point['lat'],
                        'lng' => $point['lng'],
                        'aliases' => $this->buildAliases($name, $tags, true),
                        'raw_tags' => $tags,
                        'imported_at' => now(),
                    ]
                );

                $summary['neighborhoods']++;
                continue;
            }

            $category = $this->categoryFor($tags);

            if ($category === null) {
                $summary['skipped']++;
                continue;
            }

            PointOfInterest::updateOrCreate(
                [
                    'osm_type' => (string) ($element['type'] ?? ''),
                    'osm_id' => (int) ($element['id'] ?? 0),
                ],
                [
                    'name' => $name,
                    'category' => $category,
                    'subcategory' => $this->subcategoryFor($tags),
                    'city' => $city,
                    'state' => Str::upper($state),
                    'lat' => $point['lat'],
                    'lng' => $point['lng'],
                    'aliases' => $this->buildAliases($name, $tags),
                    'raw_tags' => $tags,
                    'imported_at' => now(),
                ]
            );

            $summary['pois']++;
        }

        return $summary;
    }

    private function buildQuery(string $city, string $state): string
    {
        $city = $this->escapeOverpassString($city);
        $stateCode = $this->escapeOverpassString('BR-' . Str::upper($state));
        $timeout = (int) config('overpass.timeout', 60);

        return <<<OVERPASS
[out:json][timeout:$timeout];
area["ISO3166-2"="$stateCode"]["admin_level"="4"]->.stateArea;
rel["name"="$city"]["boundary"="administrative"]["admin_level"="8"](area.stateArea);
map_to_area->.searchArea;
(
  nwr["shop"="mall"](area.searchArea);
  nwr["amenity"~"hospital|clinic|university|college|school|bus_station|marketplace"](area.searchArea);
  nwr["industrial"](area.searchArea);
  nwr["landuse"="industrial"](area.searchArea);
  nwr["man_made"="works"](area.searchArea);
  nwr["office"="company"](area.searchArea);
  nwr["public_transport"="station"](area.searchArea);
  nwr["railway"="station"](area.searchArea);
  nwr["leisure"="park"](area.searchArea);
  nwr["tourism"="attraction"](area.searchArea);
  nwr["place"~"suburb|neighbourhood|quarter|city_block"](area.searchArea);
  nwr["boundary"="administrative"]["admin_level"~"9|10|11"](area.searchArea);
);
out tags center;
OVERPASS;
    }

    private function extractPoint(array $element): ?array
    {
        $lat = $element['lat'] ?? Arr::get($element, 'center.lat');
        $lng = $element['lon'] ?? Arr::get($element, 'center.lon');

        if (!is_numeric($lat) || !is_numeric($lng)) {
            return null;
        }

        return [
            'lat' => (float) $lat,
            'lng' => (float) $lng,
        ];
    }

    private function isNeighborhood(array $tags): bool
    {
        $place = $tags['place'] ?? null;
        if (in_array($place, ['suburb', 'neighbourhood', 'quarter', 'city_block'], true)) {
            return true;
        }

        return ($tags['boundary'] ?? null) === 'administrative'
            && in_array((string) ($tags['admin_level'] ?? ''), ['9', '10', '11'], true);
    }

    private function categoryFor(array $tags): ?string
    {
        if (($tags['shop'] ?? null) === 'mall') {
            return 'shopping';
        }

        return match ($tags['amenity'] ?? null) {
            'hospital', 'clinic' => 'hospital',
            'university', 'college' => 'university',
            'school' => 'school',
            'bus_station' => 'transport',
            'marketplace' => 'shopping',
            default => match (true) {
                isset($tags['industrial']),
                ($tags['landuse'] ?? null) === 'industrial',
                ($tags['man_made'] ?? null) === 'works',
                ($tags['office'] ?? null) === 'company' => 'industry',
                ($tags['public_transport'] ?? null) === 'station', ($tags['railway'] ?? null) === 'station' => 'transport',
                ($tags['leisure'] ?? null) === 'park', ($tags['tourism'] ?? null) === 'attraction' => 'landmark',
                default => null,
            },
        };
    }

    private function subcategoryFor(array $tags): ?string
    {
        foreach (['amenity', 'shop', 'industrial', 'landuse', 'man_made', 'office', 'public_transport', 'railway', 'leisure', 'tourism', 'place', 'boundary'] as $key) {
            if (!empty($tags[$key])) {
                return $key . '=' . $tags[$key];
            }
        }

        return null;
    }

    private function buildAliases(string $name, array $tags, bool $neighborhood = false): array
    {
        $aliases = [
            $name,
            $tags['official_name'] ?? null,
            $tags['short_name'] ?? null,
            $tags['alt_name'] ?? null,
            $tags['brand'] ?? null,
            $tags['operator'] ?? null,
            $this->extractAcronym($name),
        ];

        $normalizedName = $this->normalize($name);
        $aliases = array_merge($aliases, [
            'perto de ' . $normalizedName,
            'perto do ' . $normalizedName,
            'perto da ' . $normalizedName,
            'proximo de ' . $normalizedName,
            'proximo ao ' . $normalizedName,
            'proximo a ' . $normalizedName,
            'regiao de ' . $normalizedName,
            'regiao do ' . $normalizedName,
            'regiao da ' . $normalizedName,
        ]);

        if ($neighborhood) {
            $aliases[] = 'bairro ' . $normalizedName;
        }

        return array_values(array_unique(array_filter(array_map(
            fn ($alias) => $this->normalize((string) $alias),
            $aliases
        ))));
    }

    private function extractAcronym(string $name): ?string
    {
        if (preg_match('/^[A-Z0-9]{2,}$/', trim($name))) {
            return $name;
        }

        preg_match_all('/\b[A-ZÀ-Ý0-9]/u', $name, $matches);
        $acronym = implode('', $matches[0] ?? []);

        return strlen($acronym) >= 2 ? $acronym : null;
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

    private function escapeOverpassString(string $value): string
    {
        return str_replace(['\\', '"'], ['\\\\', '\\"'], $value);
    }
}
