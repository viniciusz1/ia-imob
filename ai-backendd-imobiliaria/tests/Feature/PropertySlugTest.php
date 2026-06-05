<?php

namespace Tests\Feature;

use App\Models\Property;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PropertySlugTest extends TestCase
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

    private function actingBroker(): User
    {
        $user = User::factory()->for(Tenant::factory())->create();
        $user->givePermissionTo(['properties.create', 'properties.edit']);
        Sanctum::actingAs($user);

        return $user;
    }

    public function test_creating_a_property_generates_a_seo_slug(): void
    {
        $this->actingBroker();

        $this->postJson('/api/properties', [
            'reference_code' => 'AP1234',
            'title' => 'Lindo apê',
            'property_type' => 'apartamento',
            'purpose' => 'venda',
            'status' => 'disponivel',
            'zip_code' => '88301-000',
            'state' => 'SC',
            'city' => 'Itajaí',
            'neighborhood' => 'Centro',
            'street' => 'Rua X',
            'number' => '10',
            'bedrooms' => 3,
            'sale_price' => 500000.00,
            'usable_area' => 80,
        ])->assertSuccessful();

        $property = Property::withoutGlobalScopes()->where('reference_code', 'AP1234')->firstOrFail();

        $this->assertSame('venda-apartamento-3-quartos-centro-itajai-ref-ap1234', $property->slug);
    }

    public function test_slug_is_stable_after_edits(): void
    {
        $this->actingBroker();

        $this->postJson('/api/properties', [
            'reference_code' => 'AP9999',
            'title' => 'Título original',
            'property_type' => 'casa',
            'purpose' => 'venda',
            'status' => 'disponivel',
            'zip_code' => '88301-000',
            'state' => 'SC',
            'city' => 'Itajaí',
            'neighborhood' => 'Fazenda',
            'street' => 'Rua Y',
            'number' => '20',
            'bedrooms' => 4,
            'sale_price' => 900000.00,
            'usable_area' => 200,
        ])->assertSuccessful();

        $property = Property::withoutGlobalScopes()->where('reference_code', 'AP9999')->firstOrFail();
        $originalSlug = $property->slug;

        $this->putJson('/api/properties/' . $property->id, [
            'title' => 'Título completamente diferente',
            'neighborhood' => 'Outro Bairro',
        ])->assertSuccessful();

        $property->refresh();
        $this->assertSame($originalSlug, $property->slug);
    }
}
