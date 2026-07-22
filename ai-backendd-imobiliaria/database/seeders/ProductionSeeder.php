<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use RuntimeException;
use Spatie\Permission\Models\Role;

class ProductionSeeder extends Seeder
{
    public function run(): void
    {
        $email = env('PLATFORM_ADMIN_EMAIL');
        $username = env('PLATFORM_ADMIN_USERNAME');
        $password = env('PLATFORM_ADMIN_PASSWORD');

        if (! $email || ! $username || ! $password) {
            throw new RuntimeException(
                'PLATFORM_ADMIN_EMAIL, PLATFORM_ADMIN_USERNAME and PLATFORM_ADMIN_PASSWORD are required.'
            );
        }

        $this->call([
            PermissionSeeder::class,
            RoleSeeder::class,
            SystemEnumSeeder::class,
            FeatureSeeder::class,
            SubscriptionPlanSeeder::class,
        ]);

        $platformAdmin = User::query()->updateOrCreate(
            ['email' => $email],
            [
                'agency_id' => null,
                'name' => env('PLATFORM_ADMIN_NAME', 'Platform Admin'),
                'username' => $username,
                'phone' => env('PLATFORM_ADMIN_PHONE', '(00) 00000-0000'),
                'person_type' => 'F',
                'password' => Hash::make($password),
                'is_active' => true,
            ]
        );

        $role = Role::query()
            ->where('name', 'Platform Admin')
            ->where('guard_name', config('auth.defaults.guard', 'web'))
            ->firstOrFail();

        $platformAdmin->syncRoles([$role]);

        $this->call(LegacyMarketDataContractSeeder::class);
    }
}
