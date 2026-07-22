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

    public function test_agency_administrator_receives_crm_permissions_only(): void
    {
        $this->seed([
            PermissionSeeder::class,
            RoleSeeder::class,
        ]);

        $permissions = Role::query()
            ->where('name', 'Administrador')
            ->firstOrFail()
            ->permissions
            ->pluck('name');

        $this->assertContains('properties.view', $permissions);
        $this->assertContains('users.view', $permissions);
        $this->assertContains('roles.manage', $permissions);
        $this->assertContains('valuations.view', $permissions);
        $this->assertFalse($permissions->contains(
            fn (string $permission): bool => str_starts_with($permission, 'platform.')
                || str_starts_with($permission, 'crawler.')
        ));
    }
}
