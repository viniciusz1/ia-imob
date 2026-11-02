<?php

namespace Tests\Feature\Crawler;

use App\Http\Controllers\Api\MarketPropertyController;
use App\Models\Crawler\CrawlAgency;
use App\Models\CrawlerRun;
use App\Models\MarketProperty;
use App\Services\Crawler\CityCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
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

        $response = app(MarketPropertyController::class)->filters(Request::create('/api/v1/market-properties/filters'));

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

        $data = app(MarketPropertyController::class)->filters(Request::create('/api/v1/market-properties/filters'))->getData(true);

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

    public function test_it_narrows_other_filter_categories_when_a_category_is_filtered(): void
    {
        $jaraguaAgency = CrawlAgency::query()->create([
            'name' => 'Imobiliária Jaraguá',
            'slug' => 'imobiliaria-jaragua',
            'base_url' => 'https://jaragua.example.com',
            'root_domain' => 'jaragua.example.com',
            'lifecycle_state' => 'active',
        ]);
        $joinvilleAgency = CrawlAgency::query()->create([
            'name' => 'Imobiliária Joinville',
            'slug' => 'imobiliaria-joinville',
            'base_url' => 'https://joinville.example.com',
            'root_domain' => 'joinville.example.com',
            'lifecycle_state' => 'active',
        ]);

        $jaraguaRun = CrawlerRun::factory()->create(['crawl_agency_id' => $jaraguaAgency->id]);
        $joinvilleRun = CrawlerRun::factory()->create(['crawl_agency_id' => $joinvilleAgency->id]);

        MarketProperty::factory()->create([
            'crawler_run_id' => $jaraguaRun->id,
            'cidade' => 'Jaraguá do Sul',
            'bairro' => 'Vila Lenzi',
            'tipo' => 'Apartamento',
            'valor' => 450000,
            'quartos' => 2,
            'suites' => 1,
            'banheiros' => 2,
            'vagas' => 1,
            'piscina' => true,
            'churrasqueira' => false,
            'academia' => false,
            'salao_festas' => false,
            'playground' => false,
            'sacada' => true,
            'mobiliado' => false,
            'ar_condicionado' => false,
            'lavanderia' => false,
            'escritorio' => false,
            'closet' => false,
            'elevador' => false,
            'portaria_24h' => false,
            'aceita_permuta' => false,
            'financiamento' => false,
        ]);

        MarketProperty::factory()->create([
            'crawler_run_id' => $joinvilleRun->id,
            'cidade' => 'Joinville',
            'bairro' => 'América',
            'tipo' => 'Casa',
            'valor' => 900000,
            'quartos' => 4,
            'suites' => 3,
            'banheiros' => 4,
            'vagas' => 3,
            'piscina' => false,
            'churrasqueira' => true,
            'academia' => false,
            'salao_festas' => false,
            'playground' => false,
            'sacada' => false,
            'mobiliado' => false,
            'ar_condicionado' => false,
            'lavanderia' => false,
            'escritorio' => false,
            'closet' => false,
            'elevador' => false,
            'portaria_24h' => false,
            'aceita_permuta' => false,
            'financiamento' => false,
        ]);

        $byCityRequest = Request::create('/api/v1/market-properties/filters', 'GET', [
            'cidade' => ['Jaraguá do Sul'],
        ]);
        $byCityData = app(MarketPropertyController::class)->filters($byCityRequest)->getData(true);

        $this->assertSame(['Jaraguá do Sul', 'Joinville'], $byCityData['cidades']);
        $this->assertSame(['Imobiliaria Jaragua'], $byCityData['imobiliarias']);
        $this->assertSame(['Apartamento'], $byCityData['tipos']);
        $this->assertSame(['Vila Lenzi'], $byCityData['bairros']);
        $this->assertSame(['Jaraguá do Sul' => ['Vila Lenzi']], $byCityData['bairros_por_cidade']);
        $this->assertSame([2], $byCityData['quartos']);
        $this->assertSame([1], $byCityData['suites']);
        $this->assertSame([2], $byCityData['banheiros']);
        $this->assertSame([1], $byCityData['vagas']);
        $this->assertSame(['piscina', 'sacada'], $byCityData['comodidades']);

        $byAgencyRequest = Request::create('/api/v1/market-properties/filters', 'GET', [
            'imobiliaria' => ['Imobiliaria Joinville'],
        ]);
        $byAgencyData = app(MarketPropertyController::class)->filters($byAgencyRequest)->getData(true);

        $this->assertSame(['Imobiliaria Jaragua', 'Imobiliaria Joinville'], $byAgencyData['imobiliarias']);
        $this->assertSame(['Joinville'], $byAgencyData['cidades']);
        $this->assertSame(['Casa'], $byAgencyData['tipos']);
        $this->assertSame(['América'], $byAgencyData['bairros']);
        $this->assertSame([4], $byAgencyData['quartos']);
        $this->assertSame(['churrasqueira'], $byAgencyData['comodidades']);
    }
}
