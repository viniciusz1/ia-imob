<?php

namespace Tests\Feature\Crawler;

use App\Services\Crawler\PropertyTypeCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CrawlerPropertyTypeCatalogSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_seeds_the_shared_property_type_catalog_and_system_enum(): void
    {
        $this->seed();

        $this->assertDatabaseCount('crawler.property_types', 19);
        $aliases = json_decode(
            (string) DB::table('crawler.property_types')
                ->where('slug', 'apartamento')
                ->value('aliases'),
            true,
            flags: JSON_THROW_ON_ERROR,
        );

        $this->assertContains('apto', $aliases);
        $this->assertContains('apartamento em condomínio', $aliases);

        $systemTypes = DB::table('system_enums')
            ->where('tag', 'property_types')
            ->value('data');
        $systemTypes = is_string($systemTypes)
            ? json_decode($systemTypes, true, flags: JSON_THROW_ON_ERROR)
            : $systemTypes;
        $systemTypeLabelsByValue = array_column($systemTypes, 'label', 'value');

        $this->assertSame('Apartamento', $systemTypeLabelsByValue['apartamento']);
        $this->assertSame('Imóvel Rural', $systemTypeLabelsByValue['imovel-rural']);
    }

    public function test_it_deactivates_legacy_types_without_deleting_them(): void
    {
        DB::table('crawler.property_types')->insert([
            'name' => 'Sobrado Geminado',
            'slug' => 'sobrado-geminado',
            'aliases' => json_encode(['sobrado geminado'], JSON_THROW_ON_ERROR),
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        PropertyTypeCatalog::synchronize();

        $this->assertDatabaseHas('crawler.property_types', [
            'slug' => 'sobrado-geminado',
            'is_active' => false,
        ]);
        $this->assertDatabaseHas('crawler.property_types', [
            'slug' => 'geminado',
            'is_active' => true,
        ]);
    }
}
