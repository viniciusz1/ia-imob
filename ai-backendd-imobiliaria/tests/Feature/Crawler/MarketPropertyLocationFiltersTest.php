<?php

namespace Tests\Feature\Crawler;

use App\Http\Controllers\Api\MarketPropertyController;
use App\Models\MarketProperty;
use App\Services\Crawler\CityCatalog;
use App\Services\Crawler\NeighborhoodCatalog;
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

    public function test_it_standardizes_jaragua_do_sul_neighborhoods_in_filters(): void
    {
        MarketProperty::factory()->create(['cidade' => 'Jaraguá do Sul', 'bairro' => 'Tres Rios do Norte']);
        MarketProperty::factory()->create(['cidade' => 'Jaraguá do Sul', 'bairro' => 'Três Rios do Norte']);
        MarketProperty::factory()->create(['cidade' => 'Jaraguá do Sul', 'bairro' => 'Três Rios no Norte']);
        MarketProperty::factory()->create(['cidade' => 'Jaraguá do Sul', 'bairro' => 'Sao Luis']);
        MarketProperty::factory()->create(['cidade' => 'Jaraguá do Sul', 'bairro' => 'São Luis']);
        MarketProperty::factory()->create(['cidade' => 'Jaraguá do Sul', 'bairro' => 'Santo Antonio']);
        MarketProperty::factory()->create(['cidade' => 'Jaraguá do Sul', 'bairro' => 'Santo Antônio']);
        MarketProperty::factory()->create(['cidade' => 'Jaraguá do Sul', 'bairro' => 'Vieiras']);
        MarketProperty::factory()->create(['cidade' => 'Jaraguá do Sul', 'bairro' => 'Vieira']);
        MarketProperty::factory()->create(['cidade' => 'Jaraguá do Sul', 'bairro' => 'Vila de chartres']);
        MarketProperty::factory()->create(['cidade' => 'Jaraguá do Sul', 'bairro' => 'Vila Chartres']);
        MarketProperty::factory()->create(['cidade' => 'Jaraguá do Sul', 'bairro' => 'Vila Rau']);
        MarketProperty::factory()->create(['cidade' => 'Jaraguá do Sul', 'bairro' => 'Tifa Monos']);
        MarketProperty::factory()->create(['cidade' => 'Jaraguá do Sul', 'bairro' => 'Tifa dos Monos']);
        MarketProperty::factory()->create(['cidade' => 'Jaraguá do Sul', 'bairro' => 'APARTAMENTO NO BAIRRO VIEIRAS']);
        MarketProperty::factory()->create(['cidade' => 'Jaraguá do Sul', 'bairro' => '2 quartos e 1 banheiro social']);

        $data = app(MarketPropertyController::class)->filters()->getData(true);

        $this->assertSame([
            'Rau',
            'Santo Antônio',
            'São Luís',
            'Tifa dos Monos',
            'Três Rios do Norte',
            'Vieira',
            'Vila Chartres',
        ], $data['bairros_por_cidade']['Jaraguá do Sul']);
    }

    public function test_it_normalizes_stored_market_property_neighborhoods(): void
    {
        $unaccented = MarketProperty::factory()->create(['cidade' => 'Jaraguá do Sul', 'bairro' => 'Tres Rios do Norte']);
        $alias = MarketProperty::factory()->create(['cidade' => 'Jaraguá do Sul', 'bairro' => 'Vila de chartres']);
        $embedded = MarketProperty::factory()->create(['cidade' => 'Jaraguá do Sul', 'bairro' => 'APARTAMENTO NO BAIRRO VIEIRAS']);
        $junk = MarketProperty::factory()->create(['cidade' => 'Jaraguá do Sul', 'bairro' => '02 vagas de garagem. Aluguel R$ 2.200']);

        NeighborhoodCatalog::normalizeStoredMarketProperties('Jaraguá do Sul');

        $this->assertSame('Três Rios do Norte', $unaccented->refresh()->bairro);
        $this->assertSame('Vila Chartres', $alias->refresh()->bairro);
        $this->assertSame('Vieira', $embedded->refresh()->bairro);
        $this->assertNull($junk->refresh()->bairro);
    }

    public function test_scope_apply_filters_matches_neighborhood_aliases(): void
    {
        MarketProperty::factory()->create(['cidade' => 'Jaraguá do Sul', 'bairro' => 'Tres Rios no Norte']);

        $results = MarketProperty::query()->applyFilters(['bairro' => ['Três Rios do Norte']])->get();

        $this->assertCount(1, $results);
    }
}
