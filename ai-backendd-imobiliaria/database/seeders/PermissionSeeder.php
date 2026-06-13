<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;

class PermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $guard = (string) config('auth.defaults.guard', 'web');

        // Define default permissions for the system
        $permissions = [
            'users.view',
            'users.create',
            'users.edit.self',
            'users.edit.all',
            'users.delete',
            'properties.view',
            'properties.create',
            'properties.edit.self',
            'properties.edit.all',
            'properties.delete',
            'roles.manage',
            'subscriptions.view',
            'subscriptions.manage',
            'valuations.create',
            'valuations.view',
        ];

        foreach ($permissions as $permissionName) {
            Permission::firstOrCreate([
                'name' => $permissionName,
                'guard_name' => $guard,
            ]);
        }
    }
}
