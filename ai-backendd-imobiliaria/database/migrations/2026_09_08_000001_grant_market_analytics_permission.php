<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    private const PERMISSION = 'analytics.market.view';

    private const ROLES = ['Administrador', 'Platform Admin'];

    public function up(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $guard = (string) config('auth.defaults.guard', 'web');

        Permission::firstOrCreate([
            'name' => self::PERMISSION,
            'guard_name' => $guard,
        ]);

        foreach (self::ROLES as $roleName) {
            Role::query()
                ->where('name', $roleName)
                ->where('guard_name', $guard)
                ->first()
                ?->givePermissionTo(self::PERMISSION);
        }

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

        if ($permission === null) {
            return;
        }

        foreach (self::ROLES as $roleName) {
            Role::query()
                ->where('name', $roleName)
                ->where('guard_name', $guard)
                ->first()
                ?->revokePermissionTo($permission);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
