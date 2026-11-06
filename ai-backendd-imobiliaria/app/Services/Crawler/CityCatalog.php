<?php

namespace App\Services\Crawler;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use LogicException;

final class CityCatalog
{
    private const URL_PATTERN = '/^(?:https?:\/\/|www\.)|:\/\//i';

    private const VER_NO_MAPA_PATTERN = '/\bver\s+no\s+mapa\b/i';

    private const CEP_PATTERN = '/(?:\s*-\s*)?\b\d{5}-?\d{3}\b/u';

    private const UF_SUFFIX_PATTERN = '/(?:\s*[-\/]\s*|\s+)(?:AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\s*$/iu';

    /**
     * @return list<array{slug: string, name: string, state: string, aliases: list<string>}>
     */
    public static function entries(): array
    {
        /** @var array<string, array{name: string, state: string, aliases: string}> $definitions */
        $definitions = require dirname(__DIR__, 3).'/database/data/crawler_cities.php';
        $entries = [];
        $ownersByNormalizedValue = [];

        foreach ($definitions as $slug => $definition) {
            $aliases = array_values(array_unique(array_filter(
                array_map('trim', explode(',', $definition['aliases'])),
                static fn (string $alias): bool => $alias !== '',
            )));
            $entry = [
                'slug' => $slug,
                'name' => $definition['name'],
                'state' => $definition['state'],
                'aliases' => $aliases,
            ];

            foreach ([$slug, $definition['name'], ...$aliases] as $value) {
                $normalized = self::normalizeKey($value);
                $owner = $ownersByNormalizedValue[$normalized] ?? null;
                if ($owner !== null && $owner !== $slug) {
                    throw new LogicException(
                        "City value [{$value}] belongs to both [{$owner}] and [{$slug}]."
                    );
                }
                $ownersByNormalizedValue[$normalized] = $slug;
            }

            $entries[] = $entry;
        }

        return $entries;
    }

    public static function synchronize(): void
    {
        DB::statement("ALTER TABLE crawler.cities ADD COLUMN IF NOT EXISTS aliases JSONB NOT NULL DEFAULT '[]'::jsonb");

        foreach (self::entries() as $entry) {
            DB::statement(
                <<<'SQL'
                    INSERT INTO crawler.cities
                        (name, slug, state, aliases, created_at, updated_at)
                    VALUES (?, ?, ?, ?::jsonb, NOW(), NOW())
                    ON CONFLICT (slug, state) DO UPDATE SET
                        name = EXCLUDED.name,
                        aliases = EXCLUDED.aliases,
                        updated_at = NOW()
                SQL,
                [
                    $entry['name'],
                    $entry['slug'],
                    $entry['state'],
                    json_encode($entry['aliases'], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE),
                ],
            );
        }
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

        return preg_match(self::URL_PATTERN, $trimmed) === 1;
    }

    public static function canonicalNameFor(?string $value): ?string
    {
        if (self::isInvalidLocationValue($value)) {
            return null;
        }

        $candidates = self::extractCandidates((string) $value);
        if ($candidates === []) {
            return null;
        }

        $canonicalByNormalized = self::canonicalNamesByNormalizedValue();
        foreach ($candidates as $candidate) {
            $normalized = self::normalizeKey($candidate);
            if (isset($canonicalByNormalized[$normalized])) {
                return $canonicalByNormalized[$normalized];
            }
        }

        return $candidates[0];
    }

    /**
     * @return list<string>
     */
    public static function aliasesFor(string $name): array
    {
        $normalizedTarget = self::normalizeKey($name);

        foreach (self::entries() as $entry) {
            if (self::normalizeKey($entry['name']) === $normalizedTarget || $entry['slug'] === $normalizedTarget) {
                return array_values(array_unique([
                    $entry['name'],
                    ...$entry['aliases'],
                    $entry['name'].'-'.$entry['state'],
                    $entry['name'].' / '.$entry['state'],
                    $entry['name'].'/'.$entry['state'],
                ]));
            }
        }

        return [$name];
    }

    public static function normalizeStoredMarketProperties(): int
    {
        $updated = 0;

        $updated += DB::table('crawler.market_properties')
            ->where(function ($query): void {
                $query->where('cidade', 'ilike', 'http://%')
                    ->orWhere('cidade', 'ilike', 'https://%')
                    ->orWhere('cidade', 'ilike', 'www.%');
            })
            ->update(['cidade' => null]);

        DB::table('crawler.market_properties')
            ->where(function ($query): void {
                $query->where('bairro', 'ilike', 'http://%')
                    ->orWhere('bairro', 'ilike', 'https://%')
                    ->orWhere('bairro', 'ilike', 'www.%');
            })
            ->update(['bairro' => null]);

        $updated += DB::table('crawler.market_properties')
            ->where('cidade', 'Vila Nova')
            ->update(['cidade' => 'Joinville']);

        $storedCities = DB::table('crawler.market_properties')
            ->whereNotNull('cidade')
            ->where('cidade', '!=', '')
            ->distinct()
            ->pluck('cidade');

        foreach ($storedCities as $storedCity) {
            $storedCity = (string) $storedCity;
            $canonicalName = self::canonicalNameFor($storedCity);

            if ($canonicalName === $storedCity) {
                continue;
            }

            $updated += DB::table('crawler.market_properties')
                ->where('cidade', $storedCity)
                ->update(['cidade' => $canonicalName]);
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
            $segments = array_reverse(explode(' - ', $cleaned));
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
        $cleaned = preg_replace('/jaragu\?\s*do\s+sul/iu', 'Jaraguá do Sul', trim($value)) ?? trim($value);
        $cleaned = preg_replace(self::VER_NO_MAPA_PATTERN, '', $cleaned) ?? $cleaned;
        $cleaned = preg_replace(self::CEP_PATTERN, '', trim($cleaned)) ?? $cleaned;
        $cleaned = preg_replace(self::UF_SUFFIX_PATTERN, '', trim($cleaned)) ?? $cleaned;

        return trim($cleaned, " \t\n\r\0\x0B-/,");
    }

    /**
     * @return array<string, string>
     */
    private static function canonicalNamesByNormalizedValue(): array
    {
        static $canonicalNames = null;

        if ($canonicalNames !== null) {
            return $canonicalNames;
        }

        $canonicalNames = [];
        foreach (self::entries() as $entry) {
            foreach ([$entry['slug'], $entry['name'], ...$entry['aliases']] as $value) {
                $canonicalNames[self::normalizeKey($value)] = $entry['name'];
            }
        }

        return $canonicalNames;
    }
}
