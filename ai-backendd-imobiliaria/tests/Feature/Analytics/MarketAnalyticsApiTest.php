<?php

namespace Tests\Feature\Analytics;

use App\Models\Agency;
use App\Models\CrawlerRun;
use App\Models\MarketProperty;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class MarketAnalyticsApiTest extends TestCase
{
    use RefreshDatabase;

    private const ENDPOINT = '/api/v1/analytics/market/overview';

    public function test_the_endpoint_requires_authentication(): void
    {
        $this->getJson(self::ENDPOINT)->assertUnauthorized();
    }

    public function test_a_user_without_the_permission_is_rejected(): void
    {
        $this->actingAs($this->user())
            ->getJson(self::ENDPOINT)
            ->assertForbidden();
    }

    public function test_the_overview_reports_every_supply_indicator(): void
    {
        $run = CrawlerRun::factory()->create(['published_at' => '2026-08-01 22:32:00']);
        MarketProperty::factory()->count(2)->create([
            'crawler_run_id' => $run->id,
            'cidade' => 'Jaraguá do Sul',
        ]);

        $response = $this->actingAs($this->userWithPermission())
            ->getJson(self::ENDPOINT)
            ->assertOk();

        $response->assertJsonPath('data.total_supply.value', 2);
        $response->assertJsonPath('data.total_supply.indicator', 'A1.01');
        $response->assertJsonPath('data.by_city.items.0.label', 'Jaraguá do Sul');
        $response->assertJsonStructure([
            'data' => [
                'total_supply', 'by_city', 'by_neighbourhood', 'by_type',
                'by_price_range', 'by_area_range', 'by_bedrooms',
                'by_parking_spaces', 'by_agency', 'field_completeness',
            ],
            'meta' => ['generated_at', 'data_reference_date'],
        ]);
        $this->assertNotNull($response->json('meta.data_reference_date'));
    }

    public function test_the_pricing_endpoint_reports_its_indicators(): void
    {
        $run = CrawlerRun::factory()->create();

        foreach ([100000, 200000, 300000, 400000, 500000] as $price) {
            MarketProperty::factory()->create(['crawler_run_id' => $run->id, 'valor' => $price]);
        }

        $this->actingAs($this->userWithPermission())
            ->getJson('/api/v1/analytics/market/pricing')
            ->assertOk()
            ->assertJsonPath('data.median_price.value', 300000)
            ->assertJsonPath('data.median_price.indicator', 'A2.01')
            ->assertJsonStructure([
                'data' => [
                    'median_price', 'average_price', 'central_price_range',
                    'median_price_per_square_metre', 'by_type', 'by_bedrooms',
                    'dispersion_by_neighbourhood',
                ],
                'meta' => ['generated_at', 'data_reference_date'],
            ]);
    }

    public function test_the_pricing_endpoint_is_gated_by_the_same_permission(): void
    {
        $this->actingAs($this->user())
            ->getJson('/api/v1/analytics/market/pricing')
            ->assertForbidden();
    }

    public function test_the_rankings_endpoint_reports_its_indicators(): void
    {
        $run = CrawlerRun::factory()->create();

        foreach ([200000, 300000, 400000, 500000, 600000] as $price) {
            MarketProperty::factory()->create([
                'crawler_run_id' => $run->id,
                'bairro' => 'Centro',
                'valor' => $price,
                'area' => 100,
            ]);
        }

        $this->actingAs($this->userWithPermission())
            ->getJson('/api/v1/analytics/market/rankings?limite=3')
            ->assertOk()
            ->assertJsonPath('data.neighbourhoods_by_price.indicator', 'A2.05')
            ->assertJsonPath('data.neighbourhoods_by_price.items.0.label', 'Centro')
            ->assertJsonCount(3, 'data.most_expensive_listings.items')
            ->assertJsonStructure([
                'data' => [
                    'neighbourhoods_by_price', 'neighbourhoods_by_square_metre',
                    'neighbourhood_extremes', 'most_expensive_listings',
                    'highest_price_per_square_metre_listings', 'cheapest_listings',
                ],
            ]);
    }

    public function test_the_rankings_endpoint_is_gated_by_the_same_permission(): void
    {
        $this->actingAs($this->user())
            ->getJson('/api/v1/analytics/market/rankings')
            ->assertForbidden();
    }

    public function test_filters_narrow_the_reported_supply(): void
    {
        $run = CrawlerRun::factory()->create();
        MarketProperty::factory()->create(['crawler_run_id' => $run->id, 'cidade' => 'Jaraguá do Sul']);
        MarketProperty::factory()->create(['crawler_run_id' => $run->id, 'cidade' => 'Guaramirim']);

        $this->actingAs($this->userWithPermission())
            ->getJson(self::ENDPOINT.'?cidade=Guaramirim')
            ->assertOk()
            ->assertJsonPath('data.total_supply.value', 1);
    }

    public function test_invalid_filters_are_rejected(): void
    {
        $this->actingAs($this->userWithPermission())
            ->getJson(self::ENDPOINT.'?min=900&max=100')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('max');
    }

    private function user(): User
    {
        return User::factory()->for(Agency::factory())->create();
    }

    private function userWithPermission(): User
    {
        $user = $this->user();
        $user->givePermissionTo(Permission::findOrCreate('analytics.market.view', 'web'));

        return $user;
    }
}
