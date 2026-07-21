<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    public function up(): void
    {
        $this->syncAgencyAdminPlatformPermissions(false);
    }

    public function down(): void
    {
        $this->syncAgencyAdminPlatformPermissions(true);
    }

    private function syncAgencyAdminPlatformPermissions(bool $grant): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $guard = (string) config('auth.defaults.guard', 'web');

        $role = Role::query()
            ->where('name', 'Administrador')
            ->where('guard_name', $guard)
            ->first();

        $permissions = Permission::query()
            ->where('guard_name', $guard)
            ->where(function ($query): void {
                $query->where('name', 'like', 'platform.%')
                    ->orWhere('name', 'like', 'crawler.%');
            })
            ->get();

        if ($role && $permissions->isNotEmpty()) {
            if ($grant) {
                $role->givePermissionTo($permissions);
            } else {
                $role->revokePermissionTo($permissions);
            }
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
