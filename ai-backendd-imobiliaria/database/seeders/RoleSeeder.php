<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $guard = (string) config('auth.defaults.guard', 'web');

        // Define the default roles for the system
        $roles = [
            'Administrador',
            'Corretor',
        ];

        foreach ($roles as $roleName) {
            Role::firstOrCreate([
                'name' => $roleName,
                'guard_name' => $guard,
            ]);
        }

        $this->seedBrokerPermissions($guard);
    }

    /**
     * Assign default permissions to the broker role.
     */
    private function seedBrokerPermissions(string $guard): void
    {
        $brokerRole = Role::query()
            ->where('name', 'Corretor')
            ->where('guard_name', $guard)
            ->first();

        if (! $brokerRole) {
            return;
        }

        $permissionNames = [
            'properties.view',
            'properties.create',
            'properties.edit.self',
            'properties.delete',
            'users.edit.self',
            'valuations.create',
            'valuations.view',
        ];

        $permissions = Permission::query()
            ->where('guard_name', $guard)
            ->whereIn('name', $permissionNames)
            ->get();

        $brokerRole->syncPermissions($permissions);
    }
}
