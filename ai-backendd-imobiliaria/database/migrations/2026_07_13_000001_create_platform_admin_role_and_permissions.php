<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    /**
     * Create the Platform Admin role, platform permissions, and the
     * default platform admin user. This migration runs automatically
     * during `make up`, ensuring the admin area is always seeded.
     */
    public function up(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $guard = (string) config('auth.defaults.guard', 'web');

        $permissionNames = [
            'platform.agencies.view',
            'platform.agencies.create',
            'platform.agencies.update',
            'platform.agencies.deactivate',
        ];

        foreach ($permissionNames as $permissionName) {
            Permission::firstOrCreate([
                'name' => $permissionName,
                'guard_name' => $guard,
            ]);
        }

        $platformAdminRole = Role::firstOrCreate([
            'name' => 'Platform Admin',
            'guard_name' => $guard,
        ]);

        $platformAdminRole->syncPermissions(
            Permission::query()
                ->where('guard_name', $guard)
                ->where('name', 'like', 'platform.%')
                ->get()
        );

        $platformAdminUser = User::firstOrCreate(
            [
                'email' => 'platform@imobiliaria.com',
            ],
            [
                'name' => 'Platform Admin',
                'username' => 'platform',
                'phone' => '(11) 99999-0000',
                'person_type' => 'F',
                'is_active' => true,
                'password' => Hash::make('password'),
                'agency_id' => null,
            ]
        );

        if (! $platformAdminUser->hasRole($platformAdminRole)) {
            $platformAdminUser->assignRole($platformAdminRole);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /**
     * Reverse the platform admin seed data.
     */
    public function down(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $guard = (string) config('auth.defaults.guard', 'web');

        $user = User::query()
            ->where('email', 'platform@imobiliaria.com')
            ->first();

        $user?->delete();

        $role = Role::query()
            ->where('name', 'Platform Admin')
            ->where('guard_name', $guard)
            ->first();

        $role?->delete();

        Permission::query()
            ->where('guard_name', $guard)
            ->where('name', 'like', 'platform.%')
            ->delete();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
