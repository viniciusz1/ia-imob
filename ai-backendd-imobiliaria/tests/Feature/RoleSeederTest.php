<?php

namespace Tests\Feature;

use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RoleSeederTest extends TestCase
{
    use RefreshDatabase;

    protected string $guard;

    protected function setUp(): void
    {
        parent::setUp();
        $this->guard = (string) config('auth.defaults.guard', 'web');
    }

    public function test_seeder_creates_default_roles(): void
    {
        $this->seed(RoleSeeder::class);

        $this->assertTrue(Role::where('name', 'Administrador')->where('guard_name', $this->guard)->exists());
        $this->assertTrue(Role::where('name', 'Corretor')->where('guard_name', $this->guard)->exists());
    }

    public function test_broker_role_has_default_permissions(): void
    {
        $this->seed(PermissionSeeder::class);
        $this->seed(RoleSeeder::class);

        $brokerRole = Role::where('name', 'Corretor')
            ->where('guard_name', $this->guard)
            ->first();

        $this->assertNotNull($brokerRole);

        $expectedPermissions = [
            'properties.view',
            'properties.create',
            'properties.edit.self',
            'properties.delete',
            'users.edit.self',
            'valuations.create',
            'valuations.view',
        ];

        foreach ($expectedPermissions as $permissionName) {
            $this->assertTrue(
                $brokerRole->hasPermissionTo($permissionName, $this->guard),
                "Broker role must have permission [{$permissionName}]"
            );
        }
    }
}
