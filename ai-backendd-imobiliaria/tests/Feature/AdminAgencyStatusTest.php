<?php

namespace Tests\Feature;

use App\Models\Agency;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminAgencyStatusTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_platform_admin_can_deactivate_agency(): void
    {
        $platformAdmin = User::where('email', 'platform@imobiliaria.com')->first();
        $agency = Agency::factory()->create(['is_active' => true]);

        $response = $this->actingAs($platformAdmin)
            ->postJson("/api/v1/admin/agencies/{$agency->id}/deactivate");

        $response->assertStatus(200);
        $this->assertFalse((bool) $agency->fresh()->is_active);
    }

    public function test_platform_admin_can_reactivate_agency(): void
    {
        $platformAdmin = User::where('email', 'platform@imobiliaria.com')->first();
        $agency = Agency::factory()->create(['is_active' => false]);

        $response = $this->actingAs($platformAdmin)
            ->postJson("/api/v1/admin/agencies/{$agency->id}/activate");

        $response->assertStatus(200);
        $this->assertTrue((bool) $agency->fresh()->is_active);
    }

    public function test_agency_user_cannot_deactivate(): void
    {
        $agency = Agency::factory()->create();
        $broker = User::factory()->for($agency)->create();

        $target = Agency::factory()->create(['is_active' => true]);

        $response = $this->actingAs($broker)
            ->postJson("/api/v1/admin/agencies/{$target->id}/deactivate");

        $response->assertStatus(403);
    }
}
