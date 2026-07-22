<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    private const PERMISSIONS = [
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

    public function up(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $guard = (string) config('auth.defaults.guard', 'web');

        foreach (self::PERMISSIONS as $name) {
            Permission::firstOrCreate([
                'name' => $name,
                'guard_name' => $guard,
            ]);
        }

        $role = Role::firstOrCreate([
            'name' => 'Platform Admin',
            'guard_name' => $guard,
        ]);
        $role->givePermissionTo(self::PERMISSIONS);

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $guard = (string) config('auth.defaults.guard', 'web');
        $permissions = Permission::query()
            ->where('guard_name', $guard)
            ->whereIn('name', self::PERMISSIONS)
            ->get();

        Role::query()
            ->where('name', 'Platform Admin')
            ->where('guard_name', $guard)
            ->first()
            ?->revokePermissionTo($permissions);

        Permission::query()
            ->where('guard_name', $guard)
            ->whereIn('name', self::PERMISSIONS)
            ->delete();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
