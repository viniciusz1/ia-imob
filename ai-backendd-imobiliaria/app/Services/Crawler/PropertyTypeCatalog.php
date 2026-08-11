<?php

namespace App\Services\Crawler;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use LogicException;

final class PropertyTypeCatalog
{
    /**
     * @return list<array{slug: string, name: string, aliases: list<string>}>
     */
    public static function entries(): array
    {
        /** @var array<string, array{name: string, aliases: string}> $definitions */
        $definitions = require dirname(__DIR__, 3).'/database/data/crawler_property_types.php';
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
                'aliases' => $aliases,
            ];

            foreach ([$slug, $definition['name'], ...$aliases] as $value) {
                $normalized = self::normalizeKey($value);
                $owner = $ownersByNormalizedValue[$normalized] ?? null;
                if ($owner !== null && $owner !== $slug) {
                    throw new LogicException(
                        "Property type value [{$value}] belongs to both [{$owner}] and [{$slug}]."
                    );
                }
                $ownersByNormalizedValue[$normalized] = $slug;
            }

            $entries[] = $entry;
        }

        return $entries;
    }

    public static function upsert(): void
    {
        foreach (self::entries() as $entry) {
            DB::statement(
                <<<'SQL'
                    INSERT INTO crawler.property_types
                        (name, slug, aliases, is_active, created_at, updated_at)
                    VALUES (?, ?, ?::jsonb, TRUE, NOW(), NOW())
                    ON CONFLICT (slug) DO UPDATE SET
                        name = EXCLUDED.name,
                        aliases = EXCLUDED.aliases,
                        is_active = TRUE,
                        updated_at = NOW()
                SQL,
                [
                    $entry['name'],
                    $entry['slug'],
                    json_encode($entry['aliases'], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE),
                ],
            );
        }
    }

    public static function synchronize(): void
    {
        self::upsert();

        DB::table('crawler.property_types')
            ->whereNotIn('slug', array_column(self::entries(), 'slug'))
            ->update([
                'is_active' => false,
                'updated_at' => now(),
            ]);
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public static function systemEnumOptions(): array
    {
        return array_map(
            static fn (array $entry): array => [
                'value' => $entry['slug'],
                'label' => $entry['name'],
            ],
            self::entries(),
        );
    }

    public static function canonicalNameFor(?string $value): ?string
    {
        if ($value === null || trim($value) === '') {
            return null;
        }

        return self::canonicalNamesByNormalizedValue()[self::normalizeKey($value)] ?? null;
    }

    public static function normalizeStoredMarketProperties(): int
    {
        $updated = 0;
        $storedTypes = DB::table('crawler.market_properties')
            ->whereNotNull('tipo')
            ->where('tipo', '!=', '')
            ->distinct()
            ->pluck('tipo');

        foreach ($storedTypes as $storedType) {
            $storedType = (string) $storedType;
            $canonicalName = self::canonicalNameFor($storedType);

            if ($canonicalName === null || $canonicalName === $storedType) {
                continue;
            }

            $updated += DB::table('crawler.market_properties')
                ->where('tipo', $storedType)
                ->update(['tipo' => $canonicalName]);
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
