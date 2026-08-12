<?php

namespace Tests\Feature;

use App\Models\Agency;
use App\Models\AgencyConfiguration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminAgencyEditTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_platform_admin_can_update_agency_basic_details(): void
    {
        $platformAdmin = User::where('email', 'platform@imobiliaria.com')->first();
        $agency = Agency::factory()->create(['name' => 'Old Name', 'slug' => 'old-slug']);

        $response = $this->actingAs($platformAdmin)
            ->putJson("/api/v1/admin/agencies/{$agency->id}", [
                'name' => 'New Name',
                'slug' => 'new-slug',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.name', 'New Name')
            ->assertJsonPath('data.slug', 'new-slug');

        $this->assertDatabaseHas('agencies', [
            'id' => $agency->id,
            'name' => 'New Name',
            'slug' => 'new-slug',
        ]);
    }

    public function test_agency_user_cannot_update_agency(): void
    {
        $agency = Agency::factory()->create();
        $broker = User::factory()->for($agency)->create();

        $target = Agency::factory()->create(['name' => 'Target']);

        $response = $this->actingAs($broker)
            ->putJson("/api/v1/admin/agencies/{$target->id}", [
                'name' => 'Hacked',
            ]);

        $response->assertStatus(403);
    }

    public function test_platform_admin_can_update_market_search_allowance_without_resetting_usage(): void
    {
        $platformAdmin = User::where('email', 'platform@imobiliaria.com')->first();
        $agency = Agency::factory()->create();
        AgencyConfiguration::create([
            'agency_id' => $agency->id,
            'market_search_weekly_limit' => 100,
        ]);
        $broker = User::factory()->for($agency)->create();

        $this->actingAs($broker)->getJson('/api/v1/market-properties')->assertOk();

        $this->actingAs($platformAdmin)
            ->putJson("/api/v1/admin/agencies/{$agency->id}/market-search-allowance", [
                'limit' => 150,
            ])
            ->assertOk()
            ->assertJsonPath('data.market_search_weekly_limit', 150)
            ->assertJsonPath('data.market_search_usage.used', 1)
            ->assertJsonPath('data.market_search_usage.remaining', 149);

        $this->assertDatabaseHas('agency_configurations', [
            'agency_id' => $agency->id,
            'market_search_weekly_limit' => 150,
        ]);
    }

    public function test_market_search_allowance_rejects_negative_values(): void
    {
        $platformAdmin = User::where('email', 'platform@imobiliaria.com')->first();
        $agency = Agency::factory()->create();

        $this->actingAs($platformAdmin)
            ->putJson("/api/v1/admin/agencies/{$agency->id}/market-search-allowance", [
                'limit' => -1,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('limit');
    }

    public function test_validation_rejects_invalid_update(): void
    {
        $platformAdmin = User::where('email', 'platform@imobiliaria.com')->first();
        $agency = Agency::factory()->create(['slug' => 'acme']);

        // Try to set slug to an already-taken value
        Agency::factory()->create(['slug' => 'taken']);

        $response = $this->actingAs($platformAdmin)
            ->putJson("/api/v1/admin/agencies/{$agency->id}", [
                'name' => '',
                'slug' => 'taken',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'slug']);
    }
}
