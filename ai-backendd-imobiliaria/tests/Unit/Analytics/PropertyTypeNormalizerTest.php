<?php

namespace Tests\Unit\Analytics;

use App\Domain\Analytics\PropertyTypeNormalizer;
use PHPUnit\Framework\TestCase;

class PropertyTypeNormalizerTest extends TestCase
{
    public function test_catalog_names_and_aliases_resolve_to_the_canonical_name(): void
    {
        $this->assertSame('Casa', PropertyTypeNormalizer::canonicalName('casa'));
        $this->assertSame('Apartamento', PropertyTypeNormalizer::canonicalName('APTO'));
        $this->assertSame('Terreno', PropertyTypeNormalizer::canonicalName('terreno'));
    }

    public function test_compound_values_resolve_by_segment(): void
    {
        $this->assertSame('Terreno', PropertyTypeNormalizer::canonicalName('Terreno / Lote'));
        $this->assertSame('Sítio', PropertyTypeNormalizer::canonicalName('Sitio/Chácara'));
        $this->assertSame('Terreno', PropertyTypeNormalizer::canonicalName('Residencial»Lote/Terreno'));
    }

    public function test_values_outside_the_catalog_are_reported_as_unclassified(): void
    {
        $this->assertSame(PropertyTypeNormalizer::UNCLASSIFIED, PropertyTypeNormalizer::canonicalName('C'));
        $this->assertSame(PropertyTypeNormalizer::UNCLASSIFIED, PropertyTypeNormalizer::canonicalName('Baependi'));
        $this->assertSame(PropertyTypeNormalizer::UNCLASSIFIED, PropertyTypeNormalizer::canonicalName(null));
        $this->assertSame(PropertyTypeNormalizer::UNCLASSIFIED, PropertyTypeNormalizer::canonicalName('  '));
    }

    public function test_map_keeps_one_entry_per_raw_value(): void
    {
        $map = PropertyTypeNormalizer::map(['Casa', 'casa', 'Terreno / Lote', '', null]);

        $this->assertSame([
            'Casa' => 'Casa',
            'casa' => 'Casa',
            'Terreno / Lote' => 'Terreno',
        ], $map);
    }
}
