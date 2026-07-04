<?php

namespace Tests\Feature;

use App\Models\Property;
use App\Models\Agency;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AgencyScopingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\PermissionSeeder::class);
        $this->seed(\Database\Seeders\SystemEnumSeeder::class);
        $this->seed(\Database\Seeders\FeatureSeeder::class);

        $this->app[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
    }

    public function test_property_listing_is_scoped_to_the_authenticated_users_agency(): void
    {
        $agencyA = Agency::factory()->create();
        $agencyB = Agency::factory()->create();

        Property::factory()->count(2)->create(['agency_id' => $agencyA->id]);
        Property::factory()->count(3)->create(['agency_id' => $agencyB->id]);

        $userA = User::factory()->for($agencyA)->create();
        $userA->givePermissionTo('properties.view');

        Sanctum::actingAs($userA);

        $response = $this->getJson('/api/properties');

        $response->assertOk()->assertJsonCount(2, 'data');
    }

    public function test_creating_a_property_assigns_the_authenticated_users_agency(): void
    {
        $agency = Agency::factory()->create();
        $user = User::factory()->for($agency)->create();
        $user->givePermissionTo('properties.create');

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/properties', [
            'reference_code' => 'TEN-0001',
            'title' => 'Apartamento do agency',
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
        ]);

        $response->assertSuccessful();
        $this->assertDatabaseHas('properties', [
            'reference_code' => 'TEN-0001',
            'agency_id' => $agency->id,
        ]);
    }
}
