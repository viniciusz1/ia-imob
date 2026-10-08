<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    private const PERMISSION = 'crawler.snapshots.review';

    public function up(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $guard = (string) config('auth.defaults.guard', 'web');
        $permission = Permission::firstOrCreate([
            'name' => self::PERMISSION,
            'guard_name' => $guard,
        ]);

        Role::query()
            ->where('name', 'Platform Admin')
            ->where('guard_name', $guard)
            ->first()
            ?->givePermissionTo($permission);

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $guard = (string) config('auth.defaults.guard', 'web');
        $permission = Permission::query()
            ->where('name', self::PERMISSION)
            ->where('guard_name', $guard)
            ->first();

        if ($permission) {
            Role::query()
                ->where('name', 'Platform Admin')
                ->where('guard_name', $guard)
                ->first()
                ?->revokePermissionTo($permission);
            $permission->delete();
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
