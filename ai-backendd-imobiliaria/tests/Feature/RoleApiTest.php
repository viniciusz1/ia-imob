<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RoleApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected User $user;

    protected int $usersViewPermissionId;

    protected int $rolesManagePermissionId;

    protected function setUp(): void
    {
        parent::setUp();

        $guard = $this->permissionGuard();

        $this->rolesManagePermissionId = Permission::firstOrCreate([
            'name' => 'roles.manage',
            'guard_name' => $guard,
        ])->id;

        $this->usersViewPermissionId = Permission::firstOrCreate([
            'name' => 'users.view',
            'guard_name' => $guard,
        ])->id;

        $this->admin = User::factory()->create();
        $this->admin->givePermissionTo('roles.manage');

        $this->user = User::factory()->create();
    }

    public function test_can_list_roles(): void
    {
        Role::firstOrCreate([
            'name' => 'Test List Role',
            'guard_name' => $this->permissionGuard(),
        ]);

        $response = $this->actingAs($this->admin)->getJson('/api/v1/roles');

        $response->assertStatus(200)
            ->assertJsonStructure(['data' => [['id', 'name', 'created_at', 'permissions']]]);
    }

    public function test_cannot_list_roles_without_permission(): void
    {
        $response = $this->actingAs($this->user)->getJson('/api/v1/roles');
        $response->assertStatus(403);
    }

    public function test_can_create_a_role(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/api/v1/roles', [
            'name' => 'Gerente',
            'permissions' => [$this->usersViewPermissionId],
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.name', 'Gerente');

        $this->assertDatabaseHas('roles', ['name' => 'Gerente']);
    }

    public function test_cannot_create_without_name(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/api/v1/roles', [
            'permissions' => [$this->usersViewPermissionId],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name']);
    }

    public function test_can_update_a_role(): void
    {
        $role = Role::create([
            'name' => 'Old Name',
            'guard_name' => $this->permissionGuard(),
        ]);

        $response = $this->actingAs($this->admin)->putJson("/api/v1/roles/{$role->id}", [
            'name' => 'New Name',
            'permissions' => [$this->usersViewPermissionId],
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.name', 'New Name');

        $this->assertDatabaseHas('roles', ['id' => $role->id, 'name' => 'New Name']);
    }

    private function permissionGuard(): string
    {
        return 'web';
    }
}
