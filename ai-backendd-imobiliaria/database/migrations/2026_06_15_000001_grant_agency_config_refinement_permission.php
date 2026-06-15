<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    public function up(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $guard = (string) config('auth.defaults.guard', 'web');
        $permission = Permission::firstOrCreate([
            'name' => 'agency_configs.refine',
            'guard_name' => $guard,
        ]);

        Role::query()
            ->where('name', 'Administrador')
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
            ->where('name', 'agency_configs.refine')
            ->where('guard_name', $guard)
            ->first();

        $adminRole = Role::query()
            ->where('name', 'Administrador')
            ->where('guard_name', $guard)
            ->first();

        if ($permission && $adminRole) {
            $adminRole->revokePermissionTo($permission);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
