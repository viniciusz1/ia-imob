<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RoleApiTest extends TestCase
{
    // Normally use RefreshDatabase but we're relying on seeder or DB transaction.
    // Usually RefreshDatabase covers this in a standard Laravel project.
    use RefreshDatabase;

    protected User $admin;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        // Replaced seeder calls with direct permission creation as per the provided snippet
        Permission::firstOrCreate(['name' => 'roles.manage']);
        Permission::firstOrCreate(['name' => 'users.view']);

        $this->admin = User::factory()->create();
        $this->admin->givePermissionTo('roles.manage');

        $this->user = User::factory()->create();
    }

    public function test_can_list_roles()
    {
        Role::firstOrCreate(['name' => 'Test List Role']);

        $response = $this->actingAs($this->admin)->getJson('/api/roles');

        $response->assertStatus(200)
            ->assertJsonStructure(['data' => [['id', 'name', 'created_at', 'permissions']]]);
    }

    public function test_cannot_list_roles_without_permission()
    {
        $response = $this->actingAs($this->user)->getJson('/api/roles');
        $response->assertStatus(403);
    }

    public function test_can_create_a_role()
    {
        $response = $this->actingAs($this->admin)->postJson('/api/roles', [
            'name' => 'Gerente',
            'permissions' => ['users.view'],
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.name', 'Gerente');

        $this->assertDatabaseHas('roles', ['name' => 'Gerente']);
    }

    public function test_cannot_create_without_name()
    {
        $response = $this->actingAs($this->admin)->postJson('/api/roles', [
            'permissions' => ['users.view'],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name']);
    }

    public function test_can_update_a_role()
    {
        $role = Role::create(['name' => 'Old Name', 'guard_name' => 'sanctum']);

        $response = $this->actingAs($this->admin)->putJson("/api/roles/{$role->id}", [
            'name' => 'New Name',
            'permissions' => [],
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.name', 'New Name');

        $this->assertDatabaseHas('roles', ['id' => $role->id, 'name' => 'New Name']);
    }
}
