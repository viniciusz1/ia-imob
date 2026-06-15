<?php

namespace Tests\Feature;

use App\Models\Agency;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlatformAdminAccessTest extends TestCase
{
    use RefreshDatabase;

    protected string $guard;

    protected function setUp(): void
    {
        parent::setUp();
        $this->guard = (string) config('auth.defaults.guard', 'web');
        $this->seed();
    }

    public function test_platform_admin_can_access_admin_endpoint(): void
    {
        $platformAdmin = User::where('email', 'platform@imobiliaria.com')->first();

        $response = $this->actingAs($platformAdmin)
            ->getJson('/api/v1/admin/ping');

        $response->assertStatus(200);
    }

    public function test_agency_user_cannot_access_admin_endpoint(): void
    {
        $agency = Agency::factory()->create();
        $broker = User::factory()->for($agency)->create();

        $response = $this->actingAs($broker)
            ->getJson('/api/v1/admin/ping');

        $response->assertStatus(403);
    }

    public function test_unauthenticated_user_cannot_access_admin_endpoint(): void
    {
        $response = $this->getJson('/api/v1/admin/ping');

        $response->assertStatus(401);
    }
}
