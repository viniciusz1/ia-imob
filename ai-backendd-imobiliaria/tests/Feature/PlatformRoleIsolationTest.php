<?php

namespace Tests\Feature;

use App\Models\Agency;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * Agency admins manage their team's groups, but platform-level capabilities
 * (platform.*, crawler.*) must stay out of their reach.
 */
class PlatformRoleIsolationTest extends TestCase
{
    use RefreshDatabase;

    private Role $platformRole;

    private Role $agencyRole;

    private Permission $crawlerPermission;

    private Permission $usersView;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['roles.manage', 'users.view', 'users.create', 'users.edit.all', 'crawler.view', 'platform.agencies.view'] as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
        }

        $this->crawlerPermission = Permission::findByName('crawler.view', 'web');
        $this->usersView = Permission::findByName('users.view', 'web');

        $this->platformRole = Role::firstOrCreate(['name' => 'Platform Admin', 'guard_name' => 'web']);
        $this->platformRole->givePermissionTo(['crawler.view', 'platform.agencies.view']);

        $this->agencyRole = Role::firstOrCreate(['name' => 'Atendente de teste', 'guard_name' => 'web']);
        $this->agencyRole->givePermissionTo('users.view');
    }

    private function agencyAdmin(): User
    {
        $admin = User::factory()->for(Agency::factory()->create())->create();
        $admin->givePermissionTo(['roles.manage', 'users.view', 'users.create', 'users.edit.all']);

        return $admin;
    }

    private function platformAdmin(): User
    {
        $admin = User::factory()->create(['agency_id' => null]);
        $admin->givePermissionTo(['roles.manage']);

        return $admin;
    }

    public function test_agency_admin_does_not_see_platform_groups_or_permissions(): void
    {
        Sanctum::actingAs($this->agencyAdmin());

        $this->getJson('/api/v1/roles')
            ->assertOk()
            ->assertJsonFragment(['name' => 'Atendente de teste'])
            ->assertJsonMissing(['name' => 'Platform Admin']);

        $this->getJson('/api/v1/permissions')
            ->assertOk()
            ->assertJsonFragment(['name' => 'users.view'])
            ->assertJsonMissing(['name' => 'crawler.view'])
            ->assertJsonMissing(['name' => 'platform.agencies.view']);
    }

    public function test_platform_admin_still_sees_everything(): void
    {
        Sanctum::actingAs($this->platformAdmin());

        $this->getJson('/api/v1/roles')->assertOk()->assertJsonFragment(['name' => 'Platform Admin']);
        $this->getJson('/api/v1/permissions')->assertOk()->assertJsonFragment(['name' => 'crawler.view']);
    }

    public function test_agency_admin_cannot_create_a_group_with_platform_permissions(): void
    {
        Sanctum::actingAs($this->agencyAdmin());

        $this->postJson('/api/v1/roles', [
            'name' => 'Escalada',
            'permissions' => [$this->usersView->id, $this->crawlerPermission->id],
        ])->assertUnprocessable()->assertJsonValidationErrors(['permissions.1']);

        $this->postJson('/api/v1/roles', [
            'name' => 'Atendimento',
            'permissions' => [$this->usersView->id],
        ])->assertCreated();
    }

    public function test_agency_admin_cannot_touch_a_platform_group(): void
    {
        Sanctum::actingAs($this->agencyAdmin());

        $this->getJson("/api/v1/roles/{$this->platformRole->id}")->assertForbidden();
        $this->putJson("/api/v1/roles/{$this->platformRole->id}", [
            'name' => 'Platform Admin',
            'permissions' => [$this->usersView->id],
        ])->assertForbidden();
        $this->deleteJson("/api/v1/roles/{$this->platformRole->id}")->assertForbidden();

        $this->assertDatabaseHas('roles', ['id' => $this->platformRole->id]);
    }

    public function test_agency_admin_cannot_assign_a_platform_group_to_a_user(): void
    {
        Sanctum::actingAs($this->agencyAdmin());

        $payload = [
            'name' => 'Novo Corretor',
            'email' => 'novo@exemplo.com',
            'phone' => '(47) 99999-8888',
            'person_type' => 'F',
            'username' => 'novocorretor',
            'password' => 'Senha@12345',
            'password_confirmation' => 'Senha@12345',
        ];

        $this->postJson('/api/v1/users', [...$payload, 'role_id' => $this->platformRole->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['role_id']);

        $this->postJson('/api/v1/users', [...$payload, 'role_id' => $this->agencyRole->id])
            ->assertCreated();
    }
}
