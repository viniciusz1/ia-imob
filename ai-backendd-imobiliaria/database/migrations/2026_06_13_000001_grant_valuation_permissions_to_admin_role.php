<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $guard = (string) config('auth.defaults.guard', 'web');
        $permissionNames = [
            'valuations.create',
            'valuations.view',
        ];

        foreach ($permissionNames as $permissionName) {
            Permission::firstOrCreate([
                'name' => $permissionName,
                'guard_name' => $guard,
            ]);
        }

        $adminRole = Role::query()
            ->where('name', 'Administrador')
            ->where('guard_name', $guard)
            ->first();

        $adminRole?->givePermissionTo($permissionNames);

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $guard = (string) config('auth.defaults.guard', 'web');
        $permissions = Permission::query()
            ->whereIn('name', ['valuations.create', 'valuations.view'])
            ->where('guard_name', $guard)
            ->get();

        $adminRole = Role::query()
            ->where('name', 'Administrador')
            ->where('guard_name', $guard)
            ->first();

        if ($adminRole && $permissions->isNotEmpty()) {
            $adminRole->revokePermissionTo($permissions);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
