<?php

namespace Tests\Feature;

use App\Models\Agency;
use App\Models\MarketProperty;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MarketSearchAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_access_policy_limits_results_and_filter_options_in_both_modes(): void
    {
        $allowed = MarketProperty::factory()->create(['cidade' => 'Joinville']);
        MarketProperty::factory()->create(['cidade' => 'Araquari']);
        $user = User::factory()->for(Agency::factory())->create();
        $user->agency->configuration()->create(['allowed_cities' => ['Joinville'], 'allowed_crawl_agency_ids' => [$allowed->crawlerRun->crawl_agency_id]]);
        $this->actingAs($user)->getJson('/api/v1/market-properties')->assertOk()->assertJsonCount(1, 'data');
        $this->actingAs($user)->getJson('/api/v1/market-properties/filters')->assertOk()->assertJsonPath('cidades', ['Joinville']);
        $this->actingAs($user)->postJson('/api/v1/market-properties/ai-search', ['prompt' => 'Imóveis', 'filters' => ['cidade' => ['Joinville']]])->assertOk()->assertJsonCount(1, 'data');
        $this->actingAs($user)->getJson('/api/v1/market-properties?cidade[]=Araquari')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_only_platform_administrators_can_configure_access(): void
    {
        $this->seed(PermissionSeeder::class);
        $agency = Agency::factory()->create();
        $admin = User::factory()->create(['agency_id' => null]);
        $admin->givePermissionTo(['platform.agencies.view', 'platform.agencies.update']);
        $property = MarketProperty::factory()->create();
        $sourceId = $property->crawlerRun->crawl_agency_id;
        $this->actingAs($admin)->getJson('/api/v1/admin/market-search/access-options')->assertOk()->assertJsonStructure(['cities', 'crawl_agencies']);
        $this->actingAs($admin)->putJson('/api/v1/admin/agencies/'.$agency->id.'/market-search-access', ['allowed_cities' => null, 'allowed_crawl_agency_ids' => [$sourceId]])->assertOk()->assertJsonPath('data.market_search_access.allowed_crawl_agency_ids', [$sourceId]);
        $this->actingAs($admin)->putJson('/api/v1/admin/agencies/'.$agency->id.'/market-search-access', ['allowed_cities' => ['Joinville'], 'allowed_crawl_agency_ids' => null])->assertOk()->assertJsonPath('data.market_search_access.allowed_cities', ['Joinville']);
        $this->actingAs($admin)->putJson('/api/v1/admin/agencies/'.$agency->id.'/market-search-access', ['allowed_cities' => [], 'allowed_crawl_agency_ids' => null])->assertUnprocessable();
        $user = User::factory()->for($agency)->create();
        $user->givePermissionTo('platform.agencies.update');
        $this->actingAs($user)->putJson('/api/v1/admin/agencies/'.$agency->id.'/market-search-access', ['allowed_cities' => null, 'allowed_crawl_agency_ids' => null])->assertForbidden();
    }
}
