<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    public function up(): void
    {
        $guard = (string) config('auth.defaults.guard', 'web');
        $permission = Permission::query()->where('name', 'analytics.market.view')->where('guard_name', $guard)->first();
        $role = Role::query()->where('name', 'Platform Admin')->where('guard_name', $guard)->first();
        if ($permission && $role && $role->hasPermissionTo($permission)) {
            $role->revokePermissionTo($permission);
        }
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        $guard = (string) config('auth.defaults.guard', 'web');
        $permission = Permission::query()->where('name', 'analytics.market.view')->where('guard_name', $guard)->first();
        $role = Role::query()->where('name', 'Platform Admin')->where('guard_name', $guard)->first();
        if ($permission && $role) {
            $role->givePermissionTo($permission);
        }
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
