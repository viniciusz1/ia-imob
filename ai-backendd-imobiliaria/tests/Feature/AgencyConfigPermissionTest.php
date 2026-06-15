<?php

namespace Tests\Feature;

use App\Models\Agency;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AgencyConfigPermissionTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_without_agency_config_view_permission_cannot_list_configs(): void
    {
        $agency = Agency::factory()->create();
        $user = User::factory()->for($agency)->create();
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v1/agency-configs');

        $response->assertForbidden();
    }

    public function test_user_with_agency_config_view_permission_can_list_configs(): void
    {
        $this->seed(\Database\Seeders\PermissionSeeder::class);
        $agency = Agency::factory()->create();
        $user = User::factory()->for($agency)->create();
        $user->givePermissionTo('agency_configs.view');
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v1/agency-configs');

        $response->assertOk();
    }

    public function test_user_with_view_permission_cannot_create_agency_config(): void
    {
        $this->seed(\Database\Seeders\PermissionSeeder::class);
        $agency = Agency::factory()->create();
        $user = User::factory()->for($agency)->create();
        $user->givePermissionTo('agency_configs.view');
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v1/agency-configs/sitemap', [
            'name' => 'Nova Agência',
            'domain' => 'https://example.com',
            'sitemap_url' => 'https://example.com/sitemap.xml',
            'is_active' => true,
        ]);

        $response->assertForbidden();
    }

    public function test_user_with_manage_permission_can_create_agency_config(): void
    {
        $this->seed(\Database\Seeders\PermissionSeeder::class);
        $agency = Agency::factory()->create();
        $user = User::factory()->for($agency)->create();
        $user->givePermissionTo('agency_configs.manage');
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v1/agency-configs/sitemap', [
            'name' => 'Nova Agência',
            'domain' => 'https://example.com',
            'sitemap_url' => 'https://example.com/sitemap.xml',
            'is_active' => true,
        ]);

        $response->assertCreated();
    }
}
