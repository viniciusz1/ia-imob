<?php

namespace App\Domain\Analytics;

use App\Services\Crawler\PropertyTypeCatalog;

final class PropertyTypeNormalizer
{
    public const UNCLASSIFIED = 'Não classificado';

    private const SEGMENT_SEPARATORS = ['/', '»', '|', ','];

    public static function canonicalName(?string $rawType): string
    {
        if ($rawType === null || trim($rawType) === '') {
            return self::UNCLASSIFIED;
        }

        $canonicalName = PropertyTypeCatalog::canonicalNameFor($rawType);

        if ($canonicalName !== null) {
            return $canonicalName;
        }

        foreach (self::segmentsOf($rawType) as $segment) {
            $canonicalName = PropertyTypeCatalog::canonicalNameFor($segment);

            if ($canonicalName !== null) {
                return $canonicalName;
            }
        }

        return self::UNCLASSIFIED;
    }

    /**
     * @param  iterable<string|null>  $rawTypes
     * @return array<string, string>
     */
    public static function map(iterable $rawTypes): array
    {
        $map = [];

        foreach ($rawTypes as $rawType) {
            if ($rawType === null || trim($rawType) === '') {
                continue;
            }

            $map[$rawType] = self::canonicalName($rawType);
        }

        return $map;
    }

    /**
     * @return list<string>
     */
    private static function segmentsOf(string $rawType): array
    {
        $normalized = str_replace(self::SEGMENT_SEPARATORS, '/', $rawType);

        $segments = array_map('trim', explode('/', $normalized));

        return array_values(array_filter(
            $segments,
            static fn (string $segment): bool => $segment !== '' && $segment !== $rawType,
        ));
    }
}
