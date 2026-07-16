<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PlatformAdminPermissionsTest extends TestCase
{
    use RefreshDatabase;

    protected string $guard;

    protected function setUp(): void
    {
        parent::setUp();
        $this->guard = (string) config('auth.defaults.guard', 'web');

        // Seed the permissions and roles so we test the actual seeders.
        $this->seed();
    }

    public function test_platform_permissions_exist(): void
    {
        $expected = [
            'platform.agencies.view',
            'platform.agencies.create',
            'platform.agencies.update',
            'platform.agencies.deactivate',
        ];

        foreach ($expected as $name) {
            $exists = Permission::where('name', $name)
                ->where('guard_name', $this->guard)
                ->exists();

            $this->assertTrue($exists, "Platform permission [{$name}] must exist");
        }
    }

    public function test_crawler_operator_permissions_exist_and_belong_to_platform_admin(): void
    {
        $expected = [
            'crawler.view',
            'crawler.prospects.manage',
            'crawler.agencies.manage',
            'crawler.operations.execute',
            'crawler.operations.cancel',
            'crawler.profiles.approve',
            'crawler.agencies.activate',
            'crawler.snapshots.publish_exceptionally',
            'crawler.policies.manage',
            'crawler.schedules.manage',
        ];

        $role = Role::query()
            ->where('name', 'Platform Admin')
            ->where('guard_name', $this->guard)
            ->firstOrFail();

        foreach ($expected as $name) {
            $this->assertDatabaseHas('permissions', [
                'name' => $name,
                'guard_name' => $this->guard,
            ]);
            $this->assertTrue($role->hasPermissionTo($name));
        }
    }

    public function test_platform_admin_role_exists_with_platform_permissions(): void
    {
        $role = Role::where('name', 'Platform Admin')
            ->where('guard_name', $this->guard)
            ->first();

        $this->assertNotNull($role, 'Platform Admin role must exist');

        $platformPermissions = Permission::where('guard_name', $this->guard)
            ->where('name', 'like', 'platform.%')
            ->pluck('id');

        $rolePermissions = $role->permissions->pluck('id');

        foreach ($platformPermissions as $permissionId) {
            $this->assertContains(
                $permissionId,
                $rolePermissions,
                'Platform Admin role must have all platform permissions'
            );
        }
    }

    public function test_user_endpoint_serializes_platform_permissions_for_platform_admin(): void
    {
        $platformAdmin = \App\Models\User::where('email', 'platform@imobiliaria.com')->first();

        $response = $this->actingAs($platformAdmin)
            ->getJson('/api/v1/user');

        $response->assertStatus(200);

        $permissions = $response->json('data.permissions');

        $this->assertIsArray($permissions);
        $this->assertContains('platform.agencies.view', $permissions);
        $this->assertContains('platform.agencies.create', $permissions);
        $this->assertContains('platform.agencies.update', $permissions);
        $this->assertContains('platform.agencies.deactivate', $permissions);
    }

    public function test_user_endpoint_excludes_platform_permissions_for_agency_user(): void
    {
        $agency = \App\Models\Agency::factory()->create();
        $broker = \App\Models\User::factory()->for($agency)->create();

        $response = $this->actingAs($broker)
            ->getJson('/api/v1/user');

        $response->assertStatus(200);

        $permissions = $response->json('data.permissions');

        // Agency users should NOT have platform permissions.
        foreach (['platform.agencies.view', 'platform.agencies.create', 'platform.agencies.update', 'platform.agencies.deactivate'] as $perm) {
            $this->assertNotContains($perm, $permissions ?? [], "Agency user must not have platform permission [{$perm}]");
        }
    }
}
