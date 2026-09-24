<?php

namespace Tests\Feature\Crawler;

use App\Http\Controllers\Api\MarketPropertyController;
use App\Http\Resources\Api\MarketPropertyResource;
use App\Models\MarketProperty;
use App\Services\Crawler\PropertyTypeCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Tests\TestCase;

class MarketPropertyTypeCatalogTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_backfills_known_aliases_and_hides_unknown_types_from_filters(): void
    {
        $knownAlias = MarketProperty::factory()->create(['tipo' => 'APTO EM CONDOMÍNIO']);
        $unknownType = MarketProperty::factory()->create(['tipo' => 'Millenium']);

        $this->assertSame(1, PropertyTypeCatalog::normalizeStoredMarketProperties());
        $this->assertSame('Apartamento', $knownAlias->refresh()->tipo);
        $this->assertSame('Millenium', $unknownType->refresh()->tipo);

        $response = app(MarketPropertyController::class)->filters(Request::create('/api/v1/market-properties/filters'));

        $this->assertSame(['Apartamento'], $response->getData(true)['tipos']);
        $this->assertSame(
            'Imóvel',
            (new MarketPropertyResource($unknownType->refresh()))
                ->toArray(Request::create('/api/v1/market-properties'))['tipo'],
        );
    }

    public function test_neighborhood_filters_are_scoped_to_city_without_changing_global_options(): void
    {
        MarketProperty::factory()->create(['cidade' => 'Jaragua do Sul', 'bairro' => 'Centro']);
        MarketProperty::factory()->create(['cidade' => 'Jaragua do Sul', 'bairro' => 'Centro']);
        MarketProperty::factory()->create(['cidade' => 'Joinville', 'bairro' => 'America']);

        $controller = app(MarketPropertyController::class);
        $all = $controller->filters(Request::create('/api/v1/market-properties/filters'))->getData(true);
        $filtered = $controller->filters(Request::create('/api/v1/market-properties/filters', 'GET', ['cidade' => 'Joinville']))->getData(true);
        $missing = $controller->filters(Request::create('/api/v1/market-properties/filters', 'GET', ['cidade' => 'Unknown']))->getData(true);

        $this->assertSame(['America', 'Centro'], $all['bairros']);
        $this->assertSame(['America'], $filtered['bairros']);
        $this->assertSame($all['cidades'], $filtered['cidades']);
        $this->assertSame([], $missing['bairros']);
    }
}
