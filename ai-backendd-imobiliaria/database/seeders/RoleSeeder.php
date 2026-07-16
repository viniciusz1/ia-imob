<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $guard = (string) config('auth.defaults.guard', 'web');

        // Define the default roles for the system
        $roles = [
            'Administrador',
            'Corretor',
            'Platform Admin',
        ];

        foreach ($roles as $roleName) {
            Role::firstOrCreate([
                'name' => $roleName,
                'guard_name' => $guard,
            ]);
        }

        $platformAdmin = Role::query()
            ->where('name', 'Platform Admin')
            ->where('guard_name', $guard)
            ->firstOrFail();

        $platformAdmin->syncPermissions(
            Permission::query()
                ->where('guard_name', $guard)
                ->where(function ($query): void {
                    $query->where('name', 'like', 'platform.%')
                        ->orWhere('name', 'like', 'crawler.%');
                })
                ->get()
        );
    }
}
