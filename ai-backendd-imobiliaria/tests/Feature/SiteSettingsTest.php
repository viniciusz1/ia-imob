<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SiteSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_view_their_tenant_site_settings(): void
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->for($tenant)->create();
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/site-settings');

        $response->assertOk()
            ->assertJsonPath('data.theme_slug', 'classic')
            ->assertJsonStructure(['data' => ['palette' => ['primary', 'secondary', 'accent']]]);
    }

    public function test_authenticated_user_can_update_branding(): void
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->for($tenant)->create();
        Sanctum::actingAs($user);

        $response = $this->putJson('/api/site-settings', [
            'color_primary' => '#112233',
            'default_whatsapp' => '5547999990000',
            'hero_title' => 'Encontre seu novo lar',
        ]);

        $response->assertOk()->assertJsonPath('data.palette.primary', '#112233');
        $this->assertDatabaseHas('tenant_site_settings', [
            'tenant_id' => $tenant->id,
            'color_primary' => '#112233',
            'default_whatsapp' => '5547999990000',
        ]);
    }

    public function test_public_site_endpoint_returns_tenant_branding(): void
    {
        $tenant = Tenant::factory()->create(['slug' => 'acme', 'name' => 'Imob Acme']);
        $tenant->siteSettings()->create(['color_primary' => '#abcdef']);

        $response = $this->getJson('http://acme.localhost/api/public/site');

        $response->assertOk()
            ->assertJsonPath('data.name', 'Imob Acme')
            ->assertJsonPath('data.palette.primary', '#abcdef');
    }
}
