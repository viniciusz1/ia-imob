<?php

namespace Tests\Feature;

use App\Models\Agency;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminAgencyDetailTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_platform_admin_can_view_agency_detail(): void
    {
        $platformAdmin = User::where('email', 'platform@imobiliaria.com')->first();
        $agency = Agency::factory()->create(['name' => 'Acme Imóveis', 'slug' => 'acme']);

        $response = $this->actingAs($platformAdmin)
            ->getJson("/api/v1/admin/agencies/{$agency->id}");

        $response->assertStatus(200)
            ->assertJsonPath('data.id', $agency->id)
            ->assertJsonPath('data.name', 'Acme Imóveis')
            ->assertJsonPath('data.slug', 'acme');
    }

    public function test_agency_detail_returns_404_for_nonexistent_agency(): void
    {
        $platformAdmin = User::where('email', 'platform@imobiliaria.com')->first();

        $response = $this->actingAs($platformAdmin)
            ->getJson('/api/v1/admin/agencies/99999');

        $response->assertStatus(404);
    }

    public function test_agency_user_cannot_view_agency_detail(): void
    {
        $agency = Agency::factory()->create();
        $broker = User::factory()->for($agency)->create();

        $response = $this->actingAs($broker)
            ->getJson("/api/v1/admin/agencies/{$agency->id}");

        $response->assertStatus(403);
    }
}
