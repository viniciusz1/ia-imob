<?php

namespace Tests\Feature\Analytics;

use App\Models\Agency;
use App\Models\CrawlerRun;
use App\Models\MarketProperty;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class MarketOverviewApiTest extends TestCase
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
            'meta' => ['generated_at', 'data_reference_date', 'notices'],
        ]);
        $this->assertNotNull($response->json('meta.data_reference_date'));
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
