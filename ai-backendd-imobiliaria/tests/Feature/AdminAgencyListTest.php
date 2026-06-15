<?php

namespace Tests\Feature;

use App\Models\Agency;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminAgencyListTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_platform_admin_can_list_agencies(): void
    {
        $platformAdmin = User::where('email', 'platform@imobiliaria.com')->first();

        $response = $this->actingAs($platformAdmin)
            ->getJson('/api/v1/admin/agencies');

        $response->assertStatus(200)
            ->assertJsonStructure(['data' => [['id', 'name', 'slug']]]);
    }

    public function test_agency_user_cannot_list_agencies(): void
    {
        $agency = Agency::factory()->create();
        $broker = User::factory()->for($agency)->create();

        $response = $this->actingAs($broker)
            ->getJson('/api/v1/admin/agencies');

        $response->assertStatus(403);
    }

    public function test_unauthenticated_user_cannot_list_agencies(): void
    {
        $response = $this->getJson('/api/v1/admin/agencies');

        $response->assertStatus(401);
    }
}
