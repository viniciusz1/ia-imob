<?php

namespace Tests\Feature\Crawler;

use App\Http\Controllers\Api\MarketPropertyController;
use App\Models\MarketProperty;
use App\Services\Crawler\CityCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MarketPropertyLocationFiltersTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_groups_available_neighborhoods_by_city(): void
    {
        MarketProperty::factory()->create(['cidade' => 'Araquari', 'bairro' => 'Itinga']);
        MarketProperty::factory()->create(['cidade' => 'Araquari', 'bairro' => 'Centro']);
        MarketProperty::factory()->create(['cidade' => 'Ascurra', 'bairro' => 'Centro']);
        MarketProperty::factory()->create(['cidade' => 'Ascurra', 'bairro' => '']);

        $response = app(MarketPropertyController::class)->filters();

        $this->assertSame([
            'Araquari' => ['Centro', 'Itinga'],
            'Ascurra' => ['Centro'],
        ], $response->getData(true)['bairros_por_cidade']);
    }

    public function test_it_deduplicates_city_variants_and_omits_urls_in_filters(): void
    {
        MarketProperty::factory()->create(['cidade' => 'Jaragua do Sul', 'bairro' => 'Centro']);
        MarketProperty::factory()->create(['cidade' => 'Jaraguá do Sul', 'bairro' => 'Vila Lenzi']);
        MarketProperty::factory()->create(['cidade' => 'Jaraguá do Sul-SC', 'bairro' => 'Baependi']);
        MarketProperty::factory()->create(['cidade' => 'Joinville', 'bairro' => 'América']);
        MarketProperty::factory()->create(['cidade' => 'Joinville / SC', 'bairro' => 'Atiradores']);
        MarketProperty::factory()->create([
            'cidade' => 'https://www.imobiliariahabitat.com.br/imovel/2637/comprar/apartamento/jaragu---do-sul/centro',
            'bairro' => 'https://www.imobiliariahabitat.com.br/imovel/2637/comprar/apartamento/jaragu---do-sul/centro',
        ]);

        $data = app(MarketPropertyController::class)->filters()->getData(true);

        $this->assertSame(['Jaraguá do Sul', 'Joinville'], $data['cidades']);
        $this->assertSame([
            'Jaraguá do Sul' => ['Baependi', 'Centro', 'Vila Lenzi'],
            'Joinville' => ['América', 'Atiradores'],
        ], $data['bairros_por_cidade']);
        $this->assertSame(['América', 'Atiradores', 'Baependi', 'Centro', 'Vila Lenzi'], $data['bairros']);
    }

    public function test_it_normalizes_stored_market_property_cities(): void
    {
        $unaccented = MarketProperty::factory()->create(['cidade' => 'Jaragua do Sul', 'bairro' => 'Centro']);
        $withUf = MarketProperty::factory()->create(['cidade' => 'Joinville / SC', 'bairro' => 'Centro']);
        $composite = MarketProperty::factory()->create(['cidade' => 'Estrada Nova - Jaraguá do Sul/SC - 89254-361', 'bairro' => 'Estrada Nova']);
        $urlRow = MarketProperty::factory()->create([
            'cidade' => 'https://www.imobiliariahabitat.com.br/imovel/2637/comprar',
            'bairro' => 'https://www.imobiliariahabitat.com.br/imovel/2637/comprar',
        ]);

        CityCatalog::normalizeStoredMarketProperties();

        $this->assertSame('Jaraguá do Sul', $unaccented->refresh()->cidade);
        $this->assertSame('Joinville', $withUf->refresh()->cidade);
        $this->assertSame('Jaraguá do Sul', $composite->refresh()->cidade);
        $this->assertNull($urlRow->refresh()->cidade);
        $this->assertNull($urlRow->refresh()->bairro);
    }
}
