<?php

namespace Tests\Feature;

use App\Models\CrawlerRun;
use App\Models\MarketProperty;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MarketPropertySchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_reads_and_writes_market_properties_in_crawler_schema(): void
    {
        $run = CrawlerRun::factory()->create();

        $property = MarketProperty::create([
            'crawler_run_id' => $run->id,
            'tipo' => 'Apartamento',
            'imobiliaria' => 'imob-test',
            'valor' => 450000.00,
            'bairro' => 'Centro',
            'cidade' => 'Jaraguá do Sul',
            'quality_status' => 'valid',
            'quality_metadata' => ['valid' => true, 'warnings' => []],
        ]);

        $this->assertIsInt($property->id);
        $this->assertSame('Apartamento', $property->fresh()->tipo);
        $this->assertSame(['valid' => true, 'warnings' => []], $property->fresh()->quality_metadata);

        $this->assertDatabaseHas('crawler.market_properties', [
            'id' => $property->id,
            'tipo' => 'Apartamento',
        ]);
    }
}
