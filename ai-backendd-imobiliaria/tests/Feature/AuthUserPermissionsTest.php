<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AuthUserPermissionsTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_response_includes_effective_permissions(): void
    {
        $viewPermission = Permission::firstOrCreate([
            'name' => 'valuations.view',
            'guard_name' => 'web',
        ]);
        Permission::firstOrCreate([
            'name' => 'valuations.create',
            'guard_name' => 'web',
        ]);

        $role = Role::firstOrCreate([
            'name' => 'Administrador',
            'guard_name' => 'web',
        ]);
        $role->givePermissionTo($viewPermission);

        $user = User::factory()->create();
        $user->assignRole($role);
        $user->givePermissionTo('valuations.create');

        $response = $this->actingAs($user)->getJson('/api/v1/user');

        $response->assertOk()
            ->assertJsonPath('data.permissions', [
                'valuations.create',
                'valuations.view',
            ]);
    }

    public function test_broker_user_response_includes_market_insights_permission(): void
    {
        $this->seed(PermissionSeeder::class);
        $this->seed(RoleSeeder::class);

        $role = Role::query()->where('name', 'Corretor')->firstOrFail();
        $user = User::factory()->create();
        $user->assignRole($role);

        $this->actingAs($user)
            ->getJson('/api/v1/user')
            ->assertOk()
            ->assertJsonPath(
                'data.permissions',
                fn ($permissions) => in_array('market_insights.view', $permissions, true)
            );
    }
}
