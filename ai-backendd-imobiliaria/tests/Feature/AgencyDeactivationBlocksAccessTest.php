<?php

namespace Tests\Feature;

use App\Models\Agency;
use App\Models\Property;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AgencyDeactivationBlocksAccessTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_deactivated_agency_user_cannot_access_crm(): void
    {
        $agency = Agency::factory()->create(['is_active' => false]);
        $user = User::factory()->for($agency)->create();

        // CRM endpoint should be blocked for users of deactivated agencies
        $response = $this->actingAs($user)
            ->getJson('/api/v1/properties');

        $response->assertStatus(403);
    }

    public function test_active_agency_user_can_access_crm(): void
    {
        $agency = Agency::factory()->create(['is_active' => true]);
        $user = User::factory()->for($agency)->create();
        $user->givePermissionTo('properties.view');

        $response = $this->actingAs($user)
            ->getJson('/api/v1/properties');

        $response->assertStatus(200);
    }

    public function test_deactivated_agency_public_site_is_unavailable(): void
    {
        $agency = Agency::factory()->create(['is_active' => false, 'slug' => 'inactive']);
        Property::factory()->create(['agency_id' => $agency->id, 'is_published' => true]);

        $response = $this->getJson('/api/v1/public/properties', [
            'X-Agency-Host' => 'inactive.localhost',
        ]);

        // Public site should return 503 when agency is deactivated
        $response->assertStatus(503);
    }
}
