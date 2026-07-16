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
            'platform.agencies.view',
            'platform.agencies.create',
            'platform.agencies.update',
            'platform.agencies.deactivate',
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

        foreach ($permissions as $permissionName) {
            Permission::firstOrCreate([
                'name' => $permissionName,
                'guard_name' => $guard,
            ]);
        }
    }
}
