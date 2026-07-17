<?php

namespace Tests\Feature;

use App\Models\Agency;
use App\Models\CrawlerRun;
use App\Models\MarketProperty;
use App\Models\User;
use Database\Seeders\CrawlerCatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class OfferMapTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->app[PermissionRegistrar::class]->forgetCachedPermissions();
        Permission::firstOrCreate(['name' => 'market_insights.view', 'guard_name' => 'web']);

        $this->seed(CrawlerCatalogSeeder::class);
    }

    public function test_user_without_permission_cannot_access_offer_map(): void
    {
        $user = User::factory()->for(Agency::factory())->create();

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v1/market-insights/offer-map?city=Jaragu%C3%A1%20do%20Sul');

        $response->assertForbidden();
    }

    public function test_city_is_required(): void
    {
        $user = $this->createUserWithPermission();

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v1/market-insights/offer-map');

        $response->assertUnprocessable()
            ->assertJsonValidationErrors('city');
    }

    public function test_counts_listings_grouped_by_neighborhood(): void
    {
        $user = $this->createUserWithPermission();

        $this->createListing(['bairro' => 'Centro', 'cidade' => 'Jaraguá do Sul', 'valor' => 300000]);
        $this->createListing(['bairro' => 'Centro', 'cidade' => 'Jaraguá do Sul', 'valor' => 400000]);
        $this->createListing(['bairro' => 'Vila Lenzi', 'cidade' => 'Jaraguá do Sul', 'valor' => 500000]);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v1/market-insights/offer-map?city=Jaragu%C3%A1%20do%20Sul');

        $response->assertOk()
            ->assertJsonPath('data.total_count', 3)
            ->assertJsonPath('data.neighborhoods', function ($neighborhoods) {
                $neighborhoods = collect($neighborhoods);
                $this->assertCount(2, $neighborhoods);

                $centro = $neighborhoods->firstWhere('name', 'Centro');
                $vilaLenzi = $neighborhoods->firstWhere('name', 'Vila Lenzi');

                $this->assertNotNull($centro);
                $this->assertNotNull($vilaLenzi);
                $this->assertSame(2, data_get($centro, 'count'));
                $this->assertSame(1, data_get($vilaLenzi, 'count'));

                return true;
            });
    }

    public function test_ignores_non_latest_and_non_completed_runs(): void
    {
        $user = $this->createUserWithPermission();

        $oldRun = CrawlerRun::factory()->create([
            'source_name' => 'source-a',
            'status' => 'completed',
            'latest' => false,
        ]);

        $failedRun = CrawlerRun::factory()->create([
            'source_name' => 'source-b',
            'status' => 'failed',
            'latest' => true,
        ]);

        $this->createListing(['crawler_run_id' => $oldRun->id, 'bairro' => 'Centro', 'cidade' => 'Jaraguá do Sul']);
        $this->createListing(['crawler_run_id' => $failedRun->id, 'bairro' => 'Centro', 'cidade' => 'Jaraguá do Sul']);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v1/market-insights/offer-map?city=Jaragu%C3%A1%20do%20Sul');

        $response->assertOk()
            ->assertJsonPath('data.total_count', 0);
    }

    public function test_deduplicates_by_link_within_same_source(): void
    {
        $user = $this->createUserWithPermission();
        $run = CrawlerRun::factory()->create(['source_name' => 'source-a']);

        $this->createListing([
            'crawler_run_id' => $run->id,
            'bairro' => 'Centro',
            'cidade' => 'Jaraguá do Sul',
            'link_imovel' => 'https://example.com/1',
        ]);

        $this->createListing([
            'crawler_run_id' => $run->id,
            'bairro' => 'Centro',
            'cidade' => 'Jaraguá do Sul',
            'link_imovel' => 'https://example.com/1',
        ]);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v1/market-insights/offer-map?city=Jaragu%C3%A1%20do%20Sul');

        $response->assertOk()
            ->assertJsonPath('data.total_count', 1);
    }

    public function test_keeps_same_link_from_different_sources(): void
    {
        $user = $this->createUserWithPermission();
        $runA = CrawlerRun::factory()->create(['source_name' => 'source-a']);
        $runB = CrawlerRun::factory()->create(['source_name' => 'source-b']);

        $this->createListing([
            'crawler_run_id' => $runA->id,
            'bairro' => 'Centro',
            'cidade' => 'Jaraguá do Sul',
            'link_imovel' => 'https://example.com/1',
        ]);

        $this->createListing([
            'crawler_run_id' => $runB->id,
            'bairro' => 'Centro',
            'cidade' => 'Jaraguá do Sul',
            'link_imovel' => 'https://example.com/1',
        ]);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v1/market-insights/offer-map?city=Jaragu%C3%A1%20do%20Sul');

        $response->assertOk()
            ->assertJsonPath('data.total_count', 2);
    }

    public function test_ignores_invalid_quality_status(): void
    {
        $user = $this->createUserWithPermission();

        $this->createListing([
            'bairro' => 'Centro',
            'cidade' => 'Jaraguá do Sul',
            'quality_status' => 'invalid',
        ]);

        $this->createListing([
            'bairro' => 'Centro',
            'cidade' => 'Jaraguá do Sul',
            'quality_status' => 'valid',
        ]);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v1/market-insights/offer-map?city=Jaragu%C3%A1%20do%20Sul');

        $response->assertOk()
            ->assertJsonPath('data.total_count', 1);
    }

    public function test_filters_by_property_type(): void
    {
        $user = $this->createUserWithPermission();

        $this->createListing(['bairro' => 'Centro', 'cidade' => 'Jaraguá do Sul', 'tipo' => 'Casa']);
        $this->createListing(['bairro' => 'Centro', 'cidade' => 'Jaraguá do Sul', 'tipo' => 'Apartamento']);
        $this->createListing(['bairro' => 'Vila Lenzi', 'cidade' => 'Jaraguá do Sul', 'tipo' => 'Casa']);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v1/market-insights/offer-map?city=Jaragu%C3%A1%20do%20Sul&tipo[]=Casa');

        $response->assertOk()
            ->assertJsonPath('data.total_count', 2)
            ->assertJsonPath('data.neighborhoods', function ($neighborhoods) {
                $this->assertCount(2, collect($neighborhoods));

                return true;
            });
    }

    public function test_filters_by_area_range(): void
    {
        $user = $this->createUserWithPermission();

        $this->createListing(['area' => 60]);
        $this->createListing(['area' => 100]);
        $this->createListing(['area' => 140]);

        Sanctum::actingAs($user);

        $this->getJson('/api/v1/market-insights/offer-map?city=Jaragu%C3%A1%20do%20Sul&min_area=80&max_area=120')
            ->assertOk()
            ->assertJsonPath('data.total_count', 1)
            ->assertJsonPath('data.neighborhoods.0.typical_area', 100);
    }

    public function test_type_filter_uses_the_canonical_catalog_value(): void
    {
        $user = $this->createUserWithPermission();

        $this->createListing(['tipo' => 'casa residencial']);
        $this->createListing(['tipo' => 'Apartamento']);

        Sanctum::actingAs($user);

        $this->getJson('/api/v1/market-insights/offer-map?city=Jaragu%C3%A1%20do%20Sul&tipo[]=Casa')
            ->assertOk()
            ->assertJsonPath('data.total_count', 1)
            ->assertJsonPath('data.neighborhoods.0.predominant_type', 'Casa');
    }

    public function test_calculates_city_share_percent(): void
    {
        $user = $this->createUserWithPermission();

        foreach (range(1, 3) as $index) {
            $this->createListing(['bairro' => 'Centro', 'cidade' => 'Jaraguá do Sul', 'valor' => $index * 100000]);
        }

        $this->createListing(['bairro' => 'Vila Lenzi', 'cidade' => 'Jaraguá do Sul', 'valor' => 100000]);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v1/market-insights/offer-map?city=Jaragu%C3%A1%20do%20Sul');

        $response->assertOk()
            ->assertJsonPath('data.neighborhoods', function ($neighborhoods) {
                $centro = collect($neighborhoods)->firstWhere('name', 'Centro');

                $this->assertNotNull($centro);
                $this->assertEqualsWithDelta(75.0, data_get($centro, 'city_share_percent'), 0.01);

                return true;
            });
    }

    public function test_predominant_type_and_price_range(): void
    {
        $user = $this->createUserWithPermission();

        foreach (range(1, 3) as $index) {
            $this->createListing([
                'bairro' => 'Centro',
                'cidade' => 'Jaraguá do Sul',
                'tipo' => 'Casa',
                'valor' => 300000,
            ]);
        }

        $this->createListing([
            'bairro' => 'Centro',
            'cidade' => 'Jaraguá do Sul',
            'tipo' => 'Apartamento',
            'valor' => 800000,
        ]);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v1/market-insights/offer-map?city=Jaragu%C3%A1%20do%20Sul');

        $response->assertOk()
            ->assertJsonPath('data.neighborhoods', function ($neighborhoods) {
                $centro = collect($neighborhoods)->firstWhere('name', 'Centro');

                $this->assertSame('Casa', data_get($centro, 'predominant_type'));
                $this->assertSame('R$ 200 mil - 400 mil', data_get($centro, 'predominant_price_range'));

                return true;
            });
    }

    public function test_calculates_median_and_percentiles(): void
    {
        $user = $this->createUserWithPermission();

        foreach ([100000, 200000, 300000, 400000, 500000] as $valor) {
            $this->createListing([
                'bairro' => 'Centro',
                'cidade' => 'Jaraguá do Sul',
                'valor' => $valor,
            ]);
        }

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v1/market-insights/offer-map?city=Jaragu%C3%A1%20do%20Sul');

        $response->assertOk()
            ->assertJsonPath('data.neighborhoods', function ($neighborhoods) {
                $centro = collect($neighborhoods)->firstWhere('name', 'Centro');

                $this->assertEqualsWithDelta(300000.0, data_get($centro, 'median_price'), 0.01);
                $this->assertEqualsWithDelta(200000.0, data_get($centro, 'p25_price'), 0.01);
                $this->assertEqualsWithDelta(400000.0, data_get($centro, 'p75_price'), 0.01);

                return true;
            });
    }

    public function test_typical_profile(): void
    {
        $user = $this->createUserWithPermission();

        $this->createListing([
            'bairro' => 'Centro',
            'cidade' => 'Jaraguá do Sul',
            'quartos' => 3,
            'vagas' => 2,
            'area' => 80,
        ]);

        $this->createListing([
            'bairro' => 'Centro',
            'cidade' => 'Jaraguá do Sul',
            'quartos' => 3,
            'vagas' => 2,
            'area' => 100,
        ]);

        $this->createListing([
            'bairro' => 'Centro',
            'cidade' => 'Jaraguá do Sul',
            'quartos' => 3,
            'vagas' => 2,
            'area' => 120,
        ]);

        $this->createListing([
            'bairro' => 'Centro',
            'cidade' => 'Jaraguá do Sul',
            'quartos' => 2,
            'vagas' => 1,
            'area' => 60,
        ]);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v1/market-insights/offer-map?city=Jaragu%C3%A1%20do%20Sul');

        $response->assertOk()
            ->assertJsonPath('data.neighborhoods', function ($neighborhoods) {
                $centro = collect($neighborhoods)->firstWhere('name', 'Centro');

                $this->assertSame(3, data_get($centro, 'typical_bedrooms'));
                $this->assertSame(2, data_get($centro, 'typical_garage_spaces'));
                $this->assertEqualsWithDelta(90.0, data_get($centro, 'typical_area'), 0.01);

                return true;
            });
    }

    public function test_tied_profile_modes_are_returned_as_mixed(): void
    {
        $user = $this->createUserWithPermission();

        $this->createListing(['quartos' => 2, 'vagas' => 1]);
        $this->createListing(['quartos' => 3, 'vagas' => 2]);

        Sanctum::actingAs($user);

        $this->getJson('/api/v1/market-insights/offer-map?city=Jaragu%C3%A1%20do%20Sul')
            ->assertOk()
            ->assertJsonPath('data.neighborhoods.0.typical_bedrooms', 'Misto')
            ->assertJsonPath('data.neighborhoods.0.typical_garage_spaces', 'Misto');
    }

    public function test_returns_distribution_geometry_coverage_and_run_metadata(): void
    {
        $user = $this->createUserWithPermission();
        $run = CrawlerRun::factory()->create([
            'source_name' => 'source-a',
            'completed_at' => '2026-07-15 12:30:00',
        ]);

        $this->createListing(['crawler_run_id' => $run->id, 'tipo' => 'Casa']);
        $this->createListing(['crawler_run_id' => $run->id, 'tipo' => 'Apartamento']);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v1/market-insights/offer-map?city=Jaragu%C3%A1%20do%20Sul');

        $response->assertOk()
            ->assertJsonPath('data.data_date', $run->completed_at->toIso8601String())
            ->assertJsonPath('data.sources.0', 'source-a')
            ->assertJsonPath('data.coverage.mapped_count', 2)
            ->assertJsonPath('data.coverage.total_count', 2)
            ->assertJsonPath('data.coverage.percent', 100)
            ->assertJsonPath('data.geometry.available', true)
            ->assertJsonPath('data.geometry.version', '1')
            ->assertJsonPath('data.geometry.source.license', 'ODbL 1.0')
            ->assertJsonCount(2, 'data.geometry.features')
            ->assertJsonPath('data.neighborhoods.0.sample_quality', 'insufficient_sample')
            ->assertJsonPath('data.neighborhoods.0.type_distribution', function ($distribution) {
                $distribution = collect($distribution);

                $this->assertSame(1, data_get($distribution->firstWhere('type', 'Casa'), 'count'));
                $this->assertSame(1, data_get($distribution->firstWhere('type', 'Apartamento'), 'count'));

                return true;
            });
    }

    public function test_unmapped_listings_are_reported_separately(): void
    {
        $user = $this->createUserWithPermission();

        $this->createListing(['bairro' => 'Centro', 'cidade' => 'Jaraguá do Sul']);
        $this->createListing(['bairro' => 'Bairro Inexistente', 'cidade' => 'Jaraguá do Sul']);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v1/market-insights/offer-map?city=Jaragu%C3%A1%20do%20Sul');

        $response->assertOk()
            ->assertJsonPath('data.total_count', 2)
            ->assertJsonPath('data.neighborhoods', function ($neighborhoods) {
                $this->assertCount(1, collect($neighborhoods));
                $this->assertSame('Centro', data_get($neighborhoods, '0.name'));

                return true;
            })
            ->assertJsonPath('data.unmapped_listings', function ($unmapped) {
                $this->assertCount(1, collect($unmapped));
                $this->assertSame('Bairro Inexistente', data_get($unmapped, '0.bairro'));

                return true;
            });
    }

    public function test_neighborhood_aliases_are_resolved_to_canonical_name(): void
    {
        $user = $this->createUserWithPermission();

        $neighborhood = \App\Models\Crawler\Neighborhood::query()
            ->where('name', 'Centro')
            ->first();

        $neighborhood?->update(['aliases' => ['Centrinho']]);

        $this->createListing(['bairro' => 'Centrinho', 'cidade' => 'Jaraguá do Sul']);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v1/market-insights/offer-map?city=Jaragu%C3%A1%20do%20Sul');

        $response->assertOk()
            ->assertJsonPath('data.neighborhoods', function ($neighborhoods) {
                $this->assertCount(1, collect($neighborhoods));
                $this->assertSame('Centro', data_get($neighborhoods, '0.name'));
                $this->assertSame('Centrinho', data_get($neighborhoods, '0.original_name'));

                return true;
            });
    }

    public function test_same_neighborhood_name_in_different_cities_does_not_mix(): void
    {
        $user = $this->createUserWithPermission();

        $otherCity = \App\Models\Crawler\City::query()->create([
            'name' => 'Joinville',
            'slug' => 'joinville',
            'state' => 'SC',
        ]);

        \App\Models\Crawler\Neighborhood::query()->create([
            'city_id' => $otherCity->id,
            'name' => 'Centro',
            'slug' => 'centro',
            'aliases' => [],
        ]);

        $this->createListing(['bairro' => 'Centro', 'cidade' => 'Jaraguá do Sul']);
        $this->createListing(['bairro' => 'Centro', 'cidade' => 'Joinville']);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v1/market-insights/offer-map?city=Jaragu%C3%A1%20do%20Sul');

        $response->assertOk()
            ->assertJsonPath('data.total_count', 1)
            ->assertJsonPath('data.neighborhoods', function ($neighborhoods) {
                $this->assertCount(1, collect($neighborhoods));
                $this->assertSame('Jaraguá do Sul', data_get($neighborhoods, '0.listings.0.cidade'));

                return true;
            });
    }

    public function test_concentration_above_city_pattern(): void
    {
        $user = $this->createUserWithPermission();

        foreach (range(1, 10) as $index) {
            $this->createListing([
                'bairro' => 'Centro',
                'cidade' => 'Jaraguá do Sul',
                'tipo' => 'Casa',
                'valor' => 300000,
            ]);
        }

        foreach (range(1, 5) as $index) {
            $this->createListing([
                'bairro' => 'Vila Lenzi',
                'cidade' => 'Jaraguá do Sul',
                'tipo' => 'Casa',
                'valor' => 300000,
            ]);
        }

        foreach (range(1, 5) as $index) {
            $this->createListing([
                'bairro' => 'Vila Lenzi',
                'cidade' => 'Jaraguá do Sul',
                'tipo' => 'Apartamento',
                'valor' => 300000,
            ]);
        }

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v1/market-insights/offer-map?city=Jaragu%C3%A1%20do%20Sul&concentration_type=Casa');

        $response->assertOk()
            ->assertJsonPath('data.neighborhoods', function ($neighborhoods) {
                $centro = collect($neighborhoods)->firstWhere('name', 'Centro');

                $this->assertNotNull($centro);
                $this->assertSame('above', data_get($centro, 'concentration.level'));
                $this->assertSame('Casa', data_get($centro, 'concentration.type'));
                $this->assertGreaterThanOrEqual(1.25, data_get($centro, 'concentration.ratio'));

                return true;
            });
    }

    public function test_concentration_marked_insufficient_when_sample_too_small(): void
    {
        $user = $this->createUserWithPermission();

        foreach (range(1, 5) as $index) {
            $this->createListing([
                'bairro' => 'Centro',
                'cidade' => 'Jaraguá do Sul',
                'tipo' => 'Casa',
                'valor' => 300000,
            ]);
        }

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v1/market-insights/offer-map?city=Jaragu%C3%A1%20do%20Sul&concentration_type=Casa');

        $response->assertOk()
            ->assertJsonPath('data.neighborhoods', function ($neighborhoods) {
                $centro = collect($neighborhoods)->firstWhere('name', 'Centro');

                $this->assertSame('insufficient_sample', data_get($centro, 'concentration.level'));
                $this->assertNull(data_get($centro, 'concentration.ratio'));

                return true;
            });
    }

    private function createUserWithPermission(): User
    {
        $user = User::factory()->for(Agency::factory())->create();
        $user->givePermissionTo('market_insights.view');

        return $user;
    }

    private function createListing(array $overrides = []): MarketProperty
    {
        return MarketProperty::factory()->create(array_merge([
            'bairro' => 'Centro',
            'cidade' => 'Jaraguá do Sul',
            'tipo' => 'Casa',
            'valor' => 300000,
            'area' => 100,
            'quartos' => 2,
            'vagas' => 1,
            'quality_status' => 'valid',
        ], $overrides));
    }
}
