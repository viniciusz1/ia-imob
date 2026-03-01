<?php

namespace Tests\Feature;

use App\Models\Property;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class PropertyTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed basic enums and permissions
        $this->seed(\Database\Seeders\PermissionSeeder::class);
        $this->seed(\Database\Seeders\SystemEnumSeeder::class);
        $this->seed(\Database\Seeders\FeatureSeeder::class);

        // Clear Spatie permission cache
        $this->app[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
    }

    public function test_admin_can_list_properties(): void
    {
        $admin = User::factory()->create();
        $admin->givePermissionTo('properties.view');

        Sanctum::actingAs($admin);

        Property::factory()->count(3)->create();

        $response = $this->getJson('/api/properties');

        $response->assertStatus(200)
            ->assertJsonCount(3, 'data');
    }

    public function test_admin_can_create_property(): void
    {
        $admin = User::factory()->create();
        $admin->givePermissionTo('properties.create');

        Sanctum::actingAs($admin);

        $payload = [
            'reference_code' => 'AP0001',
            'title' => 'Novo Apartamento',
            'description' => 'Apartamento de luxo',
            'property_type' => 'apartamento',
            'purpose' => 'venda',
            'status' => 'disponivel',
            'zip_code' => '01001-000',
            'state' => 'SP',
            'city' => 'São Paulo',
            'neighborhood' => 'Centro',
            'street' => 'Rua Direita',
            'number' => '100',
            'sale_price' => 500000.00,
            'usable_area' => 80.5,
            'bedrooms' => 2,
        ];

        $response = $this->postJson('/api/properties', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.reference_code', 'AP0001')
            ->assertJsonPath('data.title', 'Novo Apartamento');

        $this->assertDatabaseHas('properties', ['reference_code' => 'AP0001']);
    }

    public function test_admin_can_update_property_with_exclusivity(): void
    {
        $admin = User::factory()->create();
        $admin->givePermissionTo('properties.edit.all');

        Sanctum::actingAs($admin);

        $property = Property::factory()->create(['has_exclusive_right' => false]);

        $payload = [
            'title' => 'Título Atualizado',
            'has_exclusive_right' => true,
            'exclusive_right_expiration_date' => now()->addMonth()->format('Y-m-d'),
        ];

        $response = $this->putJson("/api/properties/{$property->id}", $payload);

        $response->assertStatus(200)
            ->assertJsonPath('data.title', 'Título Atualizado')
            ->assertJsonPath('data.management.has_exclusive_right', true);
    }

    public function test_forbidden_if_no_permission(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/properties');

        $response->assertStatus(403);
    }
}
