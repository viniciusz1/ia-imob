<?php

namespace Tests\Feature;

use App\Models\Agency;
use App\Models\AgencyConfiguration;
use App\Models\User;
use App\Services\MarketSearchQuotaService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use RuntimeException;
use Tests\TestCase;

class MarketSearchQuotaTest extends TestCase
{
    use RefreshDatabase;

    public function test_default_daily_allowance_allows_twenty_searches(): void
    {
        $user = User::factory()->for(Agency::factory())->create();
        for ($request = 0; $request < 20; $request++) {
            $this->actingAs($user)->getJson('/api/v1/market-properties')->assertOk();
        }
        $this->actingAs($user)->getJson('/api/v1/market-properties')
            ->assertStatus(429)->assertJsonPath('allowance.limit', 20)->assertJsonPath('allowance.used', 20);
    }

    public function test_agency_user_with_platform_permissions_cannot_manage_searches(): void
    {
        $user = User::factory()->for(Agency::factory())->create();
        $user->givePermissionTo(['platform.market-search.view', 'platform.market-search.manage']);
        $this->actingAs($user)->getJson('/api/v1/admin/market-search/users')->assertForbidden();
        $this->actingAs($user)->getJson('/api/v1/admin/market-search/history')->assertForbidden();
        $this->actingAs($user)->putJson('/api/v1/admin/market-search/users/'.$user->id, ['limit' => 100])->assertForbidden();
    }

    public function test_daily_user_limit_blocks_the_next_market_search(): void
    {
        $user = User::factory()->for(Agency::factory())->create();
        $user->forceFill(['market_search_daily_limit' => 1])->save();

        $this->actingAs($user)->getJson('/api/v1/market-properties')->assertOk();
        $this->actingAs($user)->getJson('/api/v1/market-properties')
            ->assertStatus(429)
            ->assertJsonPath('code', 'user_market_search_daily_limit_exhausted');
    }

    public function test_platform_admin_can_inspect_searches_and_set_the_user_limit(): void
    {
        $user = User::factory()->for(Agency::factory())->create();
        $admin = User::factory()->create(['agency_id' => null]);
        $admin->givePermissionTo(['platform.market-search.view', 'platform.market-search.manage']);

        $this->actingAs($user)->getJson('/api/v1/market-properties?cidade=Joinville')->assertOk();
        $this->actingAs($user)->postJson('/api/v1/market-properties/ai-search', [
            'prompt' => 'Casa em Joinville', 'filters' => ['tipo' => ['Casa']],
        ])->assertOk();

        $this->actingAs($admin)->getJson('/api/v1/admin/market-search/history?user_id='.$user->id)
            ->assertOk()->assertJsonCount(2, 'data')->assertSee('Casa em Joinville')->assertSee('Joinville');
        $this->actingAs($admin)->putJson('/api/v1/admin/market-search/users/'.$user->id, ['limit' => 2])->assertOk();
        $this->actingAs($user)->getJson('/api/v1/market-properties')->assertStatus(429);
        $this->actingAs($user)->getJson('/api/v1/admin/market-search/history')->assertForbidden();
    }

    public function test_daily_limit_is_independent_per_user_and_renews_at_midnight(): void
    {
        $agency = Agency::factory()->create();
        $first = User::factory()->for($agency)->create();
        $second = User::factory()->for($agency)->create();
        $first->forceFill(['market_search_daily_limit' => 1])->save();
        $this->actingAs($first)->getJson('/api/v1/market-properties')->assertOk();
        $this->actingAs($first)->postJson('/api/v1/market-properties/ai-search', [
            'prompt' => 'Casa', 'filters' => ['tipo' => ['Casa']],
        ])->assertStatus(429)->assertJsonPath('allowance.resets_at', '2026-08-12T00:00:00-03:00');
        $this->actingAs($second)->getJson('/api/v1/market-properties')->assertOk();

        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-08-12 00:00:00', 'America/Sao_Paulo'));
        $this->actingAs($first)->getJson('/api/v1/market-properties')->assertOk();
    }

    public function test_invalid_and_rejected_requests_do_not_appear_in_history(): void
    {
        $user = User::factory()->for(Agency::factory())->create();
        $user->forceFill(['market_search_daily_limit' => 0])->save();
        $admin = User::factory()->create(['agency_id' => null]);
        $admin->givePermissionTo('platform.market-search.view');
        $this->actingAs($user)->postJson('/api/v1/market-properties/ai-search', [])->assertUnprocessable();
        $this->actingAs($user)->getJson('/api/v1/market-properties')->assertStatus(429);
        $this->actingAs($admin)->getJson('/api/v1/admin/market-search/history?user_id='.$user->id)
            ->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_history_accepts_a_final_date_without_a_start_date(): void
    {
        $admin = User::factory()->create(['agency_id' => null]);
        $admin->givePermissionTo('platform.market-search.view');
        $this->actingAs($admin)->getJson('/api/v1/admin/market-search/history?to=2026-08-11')->assertOk();
    }

    protected function setUp(): void
    {
        parent::setUp();

        CarbonImmutable::setTestNow(CarbonImmutable::parse(
            '2026-08-11 12:00:00',
            'America/Sao_Paulo',
        ));
    }

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();

        parent::tearDown();
    }

    public function test_successful_empty_pages_consume_the_shared_agency_allowance(): void
    {
        $agency = Agency::factory()->create();
        AgencyConfiguration::create([
            'agency_id' => $agency->id,
            'market_search_weekly_limit' => 1,
        ]);
        $user = User::factory()->for($agency)->create();

        $this->actingAs($user)
            ->getJson('/api/v1/market-properties?per_page=48')
            ->assertOk();

        $this->actingAs($user)
            ->getJson('/api/v1/market-properties?per_page=48&page=2')
            ->assertStatus(429)
            ->assertJsonPath('message', 'Limite excedido. Entre em contato com a equipe técnica.')
            ->assertJsonPath('code', 'market_search_allowance_exhausted')
            ->assertJsonPath('allowance.limit', 1)
            ->assertJsonPath('allowance.used', 1)
            ->assertJsonPath('allowance.remaining', 0)
            ->assertJsonPath('allowance.resets_at', '2026-08-17T00:00:00-03:00');

        $this->assertDatabaseHas('agency_market_search_usages', [
            'agency_id' => $agency->id,
            'week_started_on' => '2026-08-10',
            'used_count' => 1,
        ]);
    }

    public function test_ai_and_conventional_modes_share_the_same_allowance(): void
    {
        $agency = Agency::factory()->create();
        AgencyConfiguration::create([
            'agency_id' => $agency->id,
            'market_search_weekly_limit' => 1,
        ]);
        $user = User::factory()->for($agency)->create();

        $this->actingAs($user)
            ->postJson('/api/v1/market-properties/ai-search', [
                'prompt' => 'Casa em Joinville',
                'filters' => ['tipo' => ['Casa']],
            ])
            ->assertOk();

        $this->actingAs($user)
            ->getJson('/api/v1/market-properties')
            ->assertStatus(429);
    }

    public function test_failed_search_returns_its_reserved_unit(): void
    {
        $agency = Agency::factory()->create();
        AgencyConfiguration::create([
            'agency_id' => $agency->id,
            'market_search_weekly_limit' => 1,
        ]);
        $quota = app(MarketSearchQuotaService::class);

        try {
            $quota->execute($agency, static fn () => throw new RuntimeException('Search failed'));
            self::fail('The failed search should throw.');
        } catch (RuntimeException $exception) {
            self::assertSame('Search failed', $exception->getMessage());
        }

        self::assertSame(0, $quota->summary($agency)['used']);
    }

    public function test_allowance_renews_on_monday_in_sao_paulo(): void
    {
        $agency = Agency::factory()->create();
        AgencyConfiguration::create([
            'agency_id' => $agency->id,
            'market_search_weekly_limit' => 1,
        ]);
        $user = User::factory()->for($agency)->create();

        $this->actingAs($user)->getJson('/api/v1/market-properties')->assertOk();

        CarbonImmutable::setTestNow(CarbonImmutable::parse(
            '2026-08-17 00:00:00',
            'America/Sao_Paulo',
        ));

        $this->actingAs($user)->getJson('/api/v1/market-properties')->assertOk();

        $this->assertDatabaseHas('agency_market_search_usages', [
            'agency_id' => $agency->id,
            'week_started_on' => '2026-08-17',
            'used_count' => 1,
        ]);
    }

    public function test_zero_allowance_disables_market_search(): void
    {
        $agency = Agency::factory()->create();
        AgencyConfiguration::create([
            'agency_id' => $agency->id,
            'market_search_weekly_limit' => 0,
        ]);
        $user = User::factory()->for($agency)->create();

        $this->actingAs($user)
            ->getJson('/api/v1/market-properties')
            ->assertStatus(429)
            ->assertJsonPath('allowance.limit', 0);
    }

    public function test_more_than_48_results_per_page_is_rejected_without_consuming_allowance(): void
    {
        $agency = Agency::factory()->create();
        $user = User::factory()->for($agency)->create();

        $this->actingAs($user)
            ->getJson('/api/v1/market-properties?per_page=99')
            ->assertStatus(422);

        $this->assertDatabaseMissing('agency_market_search_usages', [
            'agency_id' => $agency->id,
        ]);
    }

    public function test_platform_admin_cannot_use_agency_market_search(): void
    {
        $platformAdmin = User::factory()->create(['agency_id' => null]);

        $this->actingAs($platformAdmin)
            ->getJson('/api/v1/market-properties')
            ->assertStatus(403);

        $this->actingAs($platformAdmin)
            ->postJson('/api/v1/market-properties/ai-search', [
                'prompt' => 'Casa',
                'filters' => ['tipo' => ['Casa']],
            ])
            ->assertStatus(403);
    }
}
