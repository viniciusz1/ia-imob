<?php

namespace Tests\Feature;

use App\Models\Agency;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AdminAgencyRegistrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_platform_admin_can_register_agency_with_initial_admin(): void
    {
        $platformAdmin = User::where('email', 'platform@imobiliaria.com')->first();
        Role::query()->where('name', 'Administrador')->firstOrFail()->syncPermissions([]);

        $response = $this->actingAs($platformAdmin)
            ->postJson('/api/v1/admin/agencies', [
                'agency' => [
                    'name' => 'Acme Imóveis',
                    'slug' => 'acme',
                    'phone' => '(11) 3333-4444',
                    'email' => 'contato@acme.com',
                ],
                'admin' => [
                    'name' => 'João Admin',
                    'email' => 'joao@acme.com',
                    'username' => 'joaoadmin',
                    'password' => 'password123',
                    'password_confirmation' => 'password123',
                ],
            ]);

        $response->assertStatus(201);

        // Agency was created
        $this->assertDatabaseHas('agencies', [
            'name' => 'Acme Imóveis',
            'slug' => 'acme',
            'is_active' => true,
        ]);

        $agency = Agency::where('slug', 'acme')->first();

        // Initial admin was created and attached to the agency
        $this->assertDatabaseHas('users', [
            'email' => 'joao@acme.com',
            'username' => 'joaoadmin',
            'phone' => '(00) 00000-0000',
            'agency_id' => $agency->id,
        ]);

        $adminUser = User::where('email', 'joao@acme.com')->first();

        // Initial admin has the Agency Admin role
        $this->assertTrue(
            $adminUser->hasRole('Administrador'),
            'Initial admin must have Administrador role'
        );
        $this->assertTrue($adminUser->can('properties.view'));
        $this->assertTrue($adminUser->can('users.view'));
        $this->assertTrue($adminUser->can('roles.manage'));
        $this->assertFalse($adminUser->can('platform.agencies.view'));
        $this->assertFalse($adminUser->can('crawler.view'));

        // AgencySiteSettings were created
        $this->assertDatabaseHas('agency_site_settings', [
            'agency_id' => $agency->id,
        ]);
    }

    public function test_agency_user_cannot_register_agency(): void
    {
        $agency = Agency::factory()->create();
        $broker = User::factory()->for($agency)->create();

        $response = $this->actingAs($broker)
            ->postJson('/api/v1/admin/agencies', [
                'agency' => ['name' => 'Test', 'slug' => 'test'],
                'admin' => [
                    'name' => 'Test',
                    'email' => 'test@test.com',
                    'username' => 'testuser',
                    'password' => 'password123',
                    'password_confirmation' => 'password123',
                ],
            ]);

        $response->assertStatus(403);
    }

    public function test_validation_fails_without_required_fields(): void
    {
        $platformAdmin = User::where('email', 'platform@imobiliaria.com')->first();

        $response = $this->actingAs($platformAdmin)
            ->postJson('/api/v1/admin/agencies', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['agency.name', 'agency.slug', 'admin.email', 'admin.password']);
    }
}
