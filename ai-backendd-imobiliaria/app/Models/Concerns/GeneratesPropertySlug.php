<?php

namespace App\Models\Concerns;

use Illuminate\Support\Str;

/**
 * Generates a stored, SEO-friendly slug for a Property on creation.
 *
 * Format: {purpose}-{type}-{n}-quartos-{neighborhood}-{city}-ref-{reference_code}
 * The slug is generated once and kept stable across edits (changing it would
 * break indexed/shared links); the trailing reference code keeps it unique.
 */
trait GeneratesPropertySlug
{
    public static function bootGeneratesPropertySlug(): void
    {
        static::creating(function ($property) {
            if (static::isInvalidPropertySlug($property->slug)) {
                $property->slug = static::buildUniquePropertySlug($property);
            }
        });
    }

    public static function buildPropertySlug($property): string
    {
        $segments = array_filter([
            $property->purpose,
            $property->property_type,
            $property->bedrooms ? $property->bedrooms.' quartos' : null,
            $property->neighborhood,
            $property->city,
            'ref '.$property->reference_code,
        ]);

        return Str::slug(implode(' ', $segments));
    }

    public static function buildUniquePropertySlug($property): string
    {
        $baseSlug = static::buildPropertySlug($property) ?: 'imovel-'.($property->getKey() ?? uniqid());
        $slug = $baseSlug;
        $suffix = 2;

        while (static::withoutGlobalScopes()
            ->where('agency_id', $property->agency_id)
            ->where('slug', $slug)
            ->when($property->exists, fn ($query) => $query->whereKeyNot($property->getKey()))
            ->exists()
        ) {
            $slug = $baseSlug.'-'.$suffix;
            $suffix++;
        }

        return $slug;
    }

    public static function isInvalidPropertySlug(mixed $slug): bool
    {
        if (! is_string($slug)) {
            return true;
        }

        $slug = trim($slug);

        return $slug === '' || strtolower($slug) === 'null';
    }
}
