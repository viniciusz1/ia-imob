<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $guard = (string) config('auth.defaults.guard', 'web');

        $this->call([
            PermissionSeeder::class,
            RoleSeeder::class,
            SystemEnumSeeder::class,
            CrawlerCatalogSeeder::class,
            FeatureSeeder::class,
            SubscriptionPlanSeeder::class,
            AgencyDemoSeeder::class,
        ]);

        // Create admin user and assign it to a variable
        $adminUser = User::factory()->create([
            'name' => 'Administrador',
            'email' => 'admin@imobiliaria.com',
            'username' => 'admin',
            'phone' => '(11) 99999-0001',
            'person_type' => 'F',
            'is_active' => true,
            'show_on_website' => true,
            'has_broker_page' => true,
        ]);

        // Assign all agency-level permissions to the 'Administrador' role.
        // Platform permissions are reserved for the Platform Admin role.
        $adminRole = Role::where('name', 'Administrador')
            ->where('guard_name', $guard)
            ->first();

        $adminRole?->syncPermissions(
            Permission::where('guard_name', $guard)
                ->where('name', 'not like', 'platform.%')
                ->get()
        );

        // Assign the role to the admin user
        if ($adminRole) {
            $adminUser->assignRole($adminRole);
        }

        // Broker 1
        User::factory()->create([
            'name' => 'Carlos Silva',
            'email' => 'carlos@imobiliaria.com',
            'username' => 'carlos',
            'phone' => '(11) 99999-0002',
            'creci' => 'CRECI-SP 123456',
            'person_type' => 'F',
            'is_active' => true,
            'show_on_website' => true,
            'has_broker_page' => true,
        ]);

        // Broker 2
        User::factory()->create([
            'name' => 'Ana Oliveira',
            'email' => 'ana@imobiliaria.com',
            'username' => 'ana',
            'phone' => '(11) 99999-0003',
            'creci' => 'CRECI-SP 654321',
            'person_type' => 'F',
            'is_active' => true,
            'show_on_website' => true,
            'has_broker_page' => true,
        ]);

        // Inactive user (for testing inactive login block)
        User::factory()->create([
            'name' => 'Pedro Santos',
            'email' => 'pedro@imobiliaria.com',
            'username' => 'pedro',
            'phone' => '(11) 99999-0004',
            'person_type' => 'F',
            'is_active' => false,
        ]);

        // Pessoa Jurídica
        User::factory()->create([
            'name' => 'Imobiliária Horizonte LTDA',
            'email' => 'contato@horizonte.com',
            'username' => 'horizonte',
            'phone' => '(11) 3333-4444',
            'person_type' => 'J',
            'is_active' => true,
            'show_on_website' => true,
        ]);

        // 10 random users
        User::factory(10)->create();
    }
}
