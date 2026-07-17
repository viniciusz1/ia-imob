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
        $permission = Permission::firstOrCreate([
            'name' => 'market_insights.view',
            'guard_name' => $guard,
        ]);

        Role::query()
            ->where('guard_name', $guard)
            ->whereIn('name', ['Administrador', 'Corretor'])
            ->get()
            ->each(fn (Role $role) => $role->givePermissionTo($permission));

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        $guard = (string) config('auth.defaults.guard', 'web');
        $permission = Permission::query()
            ->where('name', 'market_insights.view')
            ->where('guard_name', $guard)
            ->first();

        if ($permission !== null) {
            Role::query()
                ->where('guard_name', $guard)
                ->get()
                ->each(fn (Role $role) => $role->revokePermissionTo($permission));
            $permission->delete();
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
