<?php

namespace Tests\Feature\Crawler;

use App\Http\Controllers\Api\MarketPropertyController;
use App\Models\MarketProperty;
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
}
