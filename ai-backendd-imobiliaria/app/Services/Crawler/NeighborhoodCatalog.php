<?php

namespace App\Services\Crawler;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use LogicException;

final class NeighborhoodCatalog
{
    private const URL_PATTERN = '/^(?:https?:\/\/|www\.)|:\/\//i';

    private const CEP_PATTERN = '/(?:\s*-\s*)?\b\d{5}-?\d{3}\b/u';

    private const UF_SUFFIX_PATTERN = '/(?:\s*[-\/]\s*|\s+)(?:AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\s*$/iu';

    private const VER_NO_MAPA_PATTERN = '/\bver\s+no\s+mapa\b/i';

    private const JUNK_LOCATION_PATTERN = '/\b(?:aluguel|loca[cç][aã]o|vagas?\s+de\s+garagem|garagens?\b|banheiros?\b|quartos?\b|su[íi]tes?\b|sala\s+ampla|área\s+total|área\s+privativa|aproveitar\s+bons\s+momentos|im[óo]vel\s+possui|excelente\s+op[cç][aã]o|n[aã]o\s+perca|entre\s+em\s+contato|ch[aá]cara\s+em\s+schroeder|perto\s+de\s+tudo|ótima\s+oportunidade)\b/iu';

    private const GENERIC_PROPERTY_TERMS = [
        'apartamento',
        'apartamento a venda',
        'apartamento à venda',
        'apartamento para locacao',
        'apartamento para locação',
        'apartamento mobiliado',
        'apartamento semi mobiliado',
        'apartamento terreo',
        'apartamento térreo',
        'casa',
        'casa a venda',
        'casa à venda',
        'casa para locacao',
        'casa para locação',
        'sobrado',
        'sobrado geminado',
        'geminado terreo',
        'geminado térreo',
        'terreno',
        'terreno com casa',
        'imovel',
        'imóvel',
        'sitio',
        'sítio',
        'chacara',
        'chácara',
        'sc',
    ];

    /**
     * @return array<string, list<array{city_slug: string, slug: string, name: string, aliases: list<string>}>>
     */
    public static function entries(?string $citySlug = null): array
    {
        /** @var array<string, array<string, array{name: string, aliases: string}>> $definitions */
        $definitions = require dirname(__DIR__, 3).'/database/data/crawler_neighborhoods.php';
        $entries = [];

        foreach ($definitions as $cSlug => $neighborhoods) {
            $ownersByNormalizedValue = [];
            $cityEntries = [];

            foreach ($neighborhoods as $slug => $definition) {
                $aliases = array_values(array_unique(array_filter(
                    array_map('trim', explode(',', $definition['aliases'] ?? '')),
                    static fn (string $alias): bool => $alias !== '',
                )));

                $entry = [
                    'city_slug' => $cSlug,
                    'slug' => $slug,
                    'name' => $definition['name'],
                    'aliases' => $aliases,
                ];

                foreach ([$slug, $definition['name'], ...$aliases] as $value) {
                    $normalized = self::normalizeKey($value);
                    $owner = $ownersByNormalizedValue[$normalized] ?? null;
                    if ($owner !== null && $owner !== $slug) {
                        throw new LogicException(
                            "Neighborhood value [{$value}] in [{$cSlug}] belongs to both [{$owner}] and [{$slug}]."
                        );
                    }
                    $ownersByNormalizedValue[$normalized] = $slug;
                }

                $cityEntries[] = $entry;
            }

            $entries[$cSlug] = $cityEntries;
        }

        if ($citySlug !== null) {
            return $entries[$citySlug] ?? [];
        }

        return $entries;
    }

    public static function synchronize(?string $citySlug = null): void
    {
        $allEntries = self::entries();
        if ($citySlug !== null) {
            $allEntries = isset($allEntries[$citySlug]) ? [$citySlug => $allEntries[$citySlug]] : [];
        }

        $cityIdsBySlug = DB::table('crawler.cities')->pluck('id', 'slug');

        foreach ($allEntries as $cSlug => $neighborhoods) {
            $cityId = $cityIdsBySlug[$cSlug] ?? null;
            if ($cityId === null) {
                CityCatalog::synchronize();
                $cityId = DB::table('crawler.cities')->where('slug', $cSlug)->value('id');
            }

            if ($cityId === null) {
                continue;
            }

            foreach ($neighborhoods as $entry) {
                DB::statement(
                    <<<'SQL'
                        INSERT INTO crawler.neighborhoods
                            (city_id, name, slug, aliases, created_at, updated_at)
                        VALUES (?, ?, ?, ?::jsonb, NOW(), NOW())
                        ON CONFLICT (city_id, slug) DO UPDATE SET
                            name = EXCLUDED.name,
                            aliases = EXCLUDED.aliases,
                            updated_at = NOW()
                    SQL,
                    [
                        $cityId,
                        $entry['name'],
                        $entry['slug'],
                        json_encode($entry['aliases'], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE),
                    ],
                );
            }
        }
    }

    public static function hasCatalogFor(?string $city): bool
    {
        if ($city === null || trim($city) === '') {
            return false;
        }

        $citySlug = CityCatalog::normalizeKey($city);

        return isset(self::entries()[$citySlug]);
    }

    public static function isInvalidLocationValue(?string $value): bool
    {
        if ($value === null) {
            return true;
        }

        $trimmed = trim($value);
        if ($trimmed === '') {
            return true;
        }

        if (preg_match(self::URL_PATTERN, $trimmed) === 1) {
            return true;
        }

        $normalized = self::normalizeKey($trimmed);
        if (in_array($normalized, self::GENERIC_PROPERTY_TERMS, true)) {
            return true;
        }

        if (preg_match(self::JUNK_LOCATION_PATTERN, $trimmed) === 1) {
            return true;
        }

        return false;
    }

    public static function canonicalNameFor(?string $value, ?string $city = null): ?string
    {
        if ($value === null || trim($value) === '') {
            return null;
        }

        if (preg_match(self::URL_PATTERN, trim($value)) === 1) {
            return null;
        }

        $citySlug = $city !== null ? CityCatalog::normalizeKey($city) : null;
        $candidates = self::extractCandidates((string) $value);
        if ($candidates === []) {
            return null;
        }

        $canonicalByNormalized = self::canonicalNamesByNormalizedValue($citySlug);

        // 1. Direct match on candidates
        foreach ($candidates as $candidate) {
            $normalized = self::normalizeKey($candidate);
            if (isset($canonicalByNormalized[$normalized])) {
                return $canonicalByNormalized[$normalized];
            }
        }

        // 2. Substring match for known neighborhood names in catalog
        $substringCatalog = self::substringMatchCatalog($citySlug);
        foreach ($candidates as $candidate) {
            $normalizedCandidate = '-'.self::normalizeKey($candidate).'-';
            foreach ($substringCatalog as $needle => $canonicalName) {
                if (str_contains($normalizedCandidate, '-'.$needle.'-')) {
                    return $canonicalName;
                }
            }
        }

        // If no neighborhood was recognized, check if it's junk/invalid
        if (self::isInvalidLocationValue($value)) {
            return null;
        }

        $hasCatalogForCity = $citySlug !== null && isset(self::entries()[$citySlug]);
        if ($hasCatalogForCity) {
            return null;
        }

        return $candidates[0];
    }

    /**
     * @return list<string>
     */
    public static function aliasesFor(string $name, ?string $city = null): array
    {
        $citySlug = $city !== null ? CityCatalog::normalizeKey($city) : null;
        $definitions = self::entries();

        $aliases = [];
        foreach ($definitions as $cSlug => $neighborhoods) {
            if ($citySlug !== null && $cSlug !== $citySlug) {
                continue;
            }

            foreach ($neighborhoods as $entry) {
                if (self::normalizeKey($entry['name']) === self::normalizeKey($name)
                    || $entry['slug'] === self::normalizeKey($name)) {
                    $aliases = array_merge($aliases, $entry['aliases']);
                }
            }
        }

        return array_values(array_unique($aliases));
    }

    public static function normalizeStoredMarketProperties(?string $city = null): int
    {
        $updated = 0;

        $updated += DB::table('crawler.market_properties')
            ->where(function ($query): void {
                $query->where('bairro', 'ilike', 'http://%')
                    ->orWhere('bairro', 'ilike', 'https://%')
                    ->orWhere('bairro', 'ilike', 'www.%');
            })
            ->update(['bairro' => null]);

        $targetCities = $city !== null ? [$city] : ['Jaraguá do Sul'];

        foreach ($targetCities as $targetCity) {
            $hasCatalog = self::hasCatalogFor($targetCity);

            $storedBairros = DB::table('crawler.market_properties')
                ->where(function ($q) use ($targetCity): void {
                    $q->where('cidade', $targetCity)
                        ->orWhereRaw('f_unaccent(LOWER(cidade)) = f_unaccent(LOWER(?))', [$targetCity]);
                })
                ->whereNotNull('bairro')
                ->where('bairro', '!=', '')
                ->distinct()
                ->pluck('bairro');

            foreach ($storedBairros as $storedBairro) {
                $storedBairro = (string) $storedBairro;
                $canonicalName = self::canonicalNameFor($storedBairro, $targetCity);

                if ($canonicalName === $storedBairro) {
                    continue;
                }

                $updateQuery = DB::table('crawler.market_properties')
                    ->where(function ($q) use ($targetCity): void {
                        $q->where('cidade', $targetCity)
                            ->orWhereRaw('f_unaccent(LOWER(cidade)) = f_unaccent(LOWER(?))', [$targetCity]);
                    })
                    ->where('bairro', $storedBairro);

                if ($canonicalName !== null) {
                    $updated += $updateQuery->update(['bairro' => $canonicalName]);
                } elseif ($hasCatalog || self::isInvalidLocationValue($storedBairro)) {
                    $updated += $updateQuery->update(['bairro' => null]);
                }
            }
        }

        return $updated;
    }

    public static function normalizeKey(string $value): string
    {
        return trim(
            preg_replace('/[^a-z0-9]+/', '-', strtolower(Str::ascii($value))) ?? '',
            '-'
        );
    }

    /**
     * @return list<string>
     */
    private static function extractCandidates(string $value): array
    {
        $cleaned = self::stripNoise($value);
        if ($cleaned === '') {
            return [];
        }

        $candidates = [$cleaned];
        if (str_contains($cleaned, ' - ')) {
            $segments = explode(' - ', $cleaned);
            foreach ($segments as $segment) {
                $cleanedSegment = self::stripNoise($segment);
                if ($cleanedSegment !== '' && ! in_array($cleanedSegment, $candidates, true)) {
                    $candidates[] = $cleanedSegment;
                }
            }
        }

        return $candidates;
    }

    private static function stripNoise(string $value): string
    {
        $cleaned = preg_replace(self::VER_NO_MAPA_PATTERN, '', trim($value)) ?? trim($value);
        $cleaned = preg_replace(self::CEP_PATTERN, '', trim($cleaned)) ?? $cleaned;
        $cleaned = preg_replace(self::UF_SUFFIX_PATTERN, '', trim($cleaned)) ?? $cleaned;

        // Strip prefix "Bairro " or "no bairro " if present
        $cleaned = preg_replace('/^(?:apartamento|casa|sobrado|terreno|im[oó]vel|ampla casa|lindo apartamento|bel[íi]ssima casa|bel[íi]ssimo apartamento|excelente casa|ch[aá]cara|sitio|s[íi]tio)\s+(?:duplex\s+)?(?:geminado\s+)?(?:mobiliado\s+)?(?:novo\s+)?(?:com\s+[^–-]+)?(?:no|na|em)\s+(?:bairro\s+)?/iu', '', $cleaned) ?? $cleaned;
        $cleaned = preg_replace('/^(?:bairro|regi[aã]o)\s+(?:de\s+|do\s+|da\s+)?/iu', '', trim($cleaned)) ?? $cleaned;

        return trim($cleaned, " \t\n\r\0\x0B-/,");
    }

    /**
     * @return array<string, string>
     */
    private static function canonicalNamesByNormalizedValue(?string $citySlug = null): array
    {
        static $canonicalByCity = [];

        $key = $citySlug ?? '_all_';
        if (isset($canonicalByCity[$key])) {
            return $canonicalByCity[$key];
        }

        $definitions = self::entries();
        $mapping = [];

        foreach ($definitions as $cSlug => $neighborhoods) {
            if ($citySlug !== null && $cSlug !== $citySlug) {
                continue;
            }

            foreach ($neighborhoods as $entry) {
                foreach ([$entry['slug'], $entry['name'], ...$entry['aliases']] as $val) {
                    $norm = self::normalizeKey($val);
                    $mapping[$norm] = $entry['name'];
                }
            }
        }

        $canonicalByCity[$key] = $mapping;

        return $mapping;
    }

    /**
     * @return array<string, string> needle normalized => canonical name, sorted by length desc
     */
    private static function substringMatchCatalog(?string $citySlug = null): array
    {
        static $substringByCity = [];

        $key = $citySlug ?? '_all_';
        if (isset($substringByCity[$key])) {
            return $substringByCity[$key];
        }

        $canonicalMapping = self::canonicalNamesByNormalizedValue($citySlug);
        // Sort keys by string length descending so longer phrases match first (e.g. "barra do rio cerro" before "rio cerro")
        uksort($canonicalMapping, static fn (string $a, string $b): int => strlen($b) <=> strlen($a));

        $substringByCity[$key] = $canonicalMapping;

        return $canonicalMapping;
    }
}
