<?php

namespace Tests\Feature;

use App\Models\Agency;
use App\Models\MarketProperty;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class MarketPriceSuggestionApiTest extends TestCase
{
    use RefreshDatabase;

    private const ENDPOINT = '/api/v1/valuations/price-suggestion';

    protected function setUp(): void
    {
        parent::setUp();
        $this->app[PermissionRegistrar::class]->forgetCachedPermissions();
        Permission::firstOrCreate(['name' => 'valuations.create', 'guard_name' => 'web']);
    }

    public function test_suggestion_requires_authentication_and_existing_valuation_permission(): void
    {
        $this->postJson(self::ENDPOINT, $this->input())->assertUnauthorized();
        Sanctum::actingAs(User::factory()->for(Agency::factory())->create());
        $this->postJson(self::ENDPOINT, $this->input())->assertForbidden();
        $this->assertDatabaseCount('property_valuations', 0);
    }

    public function test_group_permission_is_serialized_and_authorizes_the_suggestion(): void
    {
        $this->authorizeUser();
        $this->getJson('/api/v1/user')->assertOk()->assertJsonPath('data.permissions', ['valuations.create']);
        $this->postJson(self::ENDPOINT, $this->input())->assertOk()
            ->assertJsonPath('data.status', 'insufficient_sample')->assertJsonPath('data.range', null);
        $this->assertDatabaseCount('property_valuations', 0);
        $this->assertDatabaseCount('properties', 0);
    }

    public static function purposes(): array
    {
        return [
            'sale' => ['sale', [660000, 720000, 780000]],
            'monthly rent' => ['rent', [2640, 2880, 3120]],
        ];
    }

    #[DataProvider('purposes')]
    public function test_suggestion_reuses_saved_valuation_calculation_without_persisting(string $purpose, array $expected): void
    {
        $this->authorizeUser();
        foreach ([500000, 550000, 600000, 650000, 700000] as $index => $sale) {
            $this->comparable(['valor' => $sale, 'valor_aluguel' => 2000 + $index * 200]);
        }
        $this->comparable(['bairro' => 'Outro bairro', 'valor' => 9000000, 'valor_aluguel' => 90000]);
        $payload = $this->input(['purpose' => $purpose]);
        $response = $this->postJson(self::ENDPOINT, $payload)->assertOk()
            ->assertJsonPath('data.status', 'calculated')
            ->assertJsonPath('data.purpose', $purpose)
            ->assertJsonPath('data.range.min', $expected[0])
            ->assertJsonPath('data.range.central', $expected[1])
            ->assertJsonPath('data.range.max', $expected[2])
            ->assertJsonPath('data.sample_summary.used_count', 5)
            ->assertJsonMissingPath('data.comparable_evidence');
        $this->assertDatabaseCount('property_valuations', 0);
        $this->assertDatabaseCount('properties', 0);
        $saved = $this->postJson('/api/v1/valuations', $payload)->assertCreated();
        foreach (['min', 'central', 'max'] as $key) {
            $this->assertEquals($saved->json("data.final_range.$key"), $response->json("data.range.$key"));
        }
    }

    public function test_rental_suggestion_does_not_fall_back_to_sale_and_requires_five_comparables(): void
    {
        $this->authorizeUser();
        foreach (range(1, 5) as $index) {
            $this->comparable(['valor_aluguel' => $index === 5 ? null : 2000]);
        }
        $this->postJson(self::ENDPOINT, $this->input(['purpose' => 'rent']))->assertOk()
            ->assertJsonPath('data.status', 'insufficient_sample')
            ->assertJsonPath('data.range', null)
            ->assertJsonPath('data.sample_summary.minimum_required', 5);
        $this->assertDatabaseCount('property_valuations', 0);
    }

    public function test_suggestion_applies_flood_adjustment_and_rounds_currency(): void
    {
        $this->authorizeUser();
        foreach (range(1, 5) as $index) {
            $this->comparable(['valor_aluguel' => 2350.51]);
        }
        $this->postJson(self::ENDPOINT, $this->input(['purpose' => 'rent', 'area' => 100, 'flood_risk' => true]))
            ->assertOk()->assertJsonPath('data.range.central', 1645.36)
            ->assertJsonPath('data.flood_adjustment_percent', 30);
        $this->assertDatabaseCount('property_valuations', 0);
    }

    public function test_incomplete_unsupported_and_reviewed_requests_are_rejected(): void
    {
        $this->authorizeUser();
        $this->postJson(self::ENDPOINT, [])->assertUnprocessable()
            ->assertJsonValidationErrors(['purpose', 'city', 'neighborhood', 'area', 'residential_type']);
        $this->postJson(self::ENDPOINT, $this->input([
            'purpose' => 'seasonal', 'city' => ['Cidade Teste', 'Outra cidade'],
            'neighborhood' => ['Centro', 'Outro bairro'], 'residential_type' => 'land',
            'area' => 0, 'bedrooms' => 11, 'bathrooms' => -1, 'garage_spaces' => 1.5,
            'comparable_reviews' => [['market_property_id' => 1, 'status' => 'approved']],
        ]))->assertUnprocessable()->assertJsonValidationErrors([
            'purpose', 'city', 'neighborhood', 'residential_type', 'area',
            'bedrooms', 'bathrooms', 'garage_spaces', 'comparable_reviews',
        ]);
        $this->assertDatabaseCount('property_valuations', 0);
    }

    public function test_inactive_agency_cannot_request_suggestions(): void
    {
        $user = $this->authorizeUser();
        $user->agency->update(['is_active' => false]);
        $this->postJson(self::ENDPOINT, $this->input())->assertForbidden();
    }

    private function authorizeUser(): User
    {
        $role = Role::firstOrCreate(['name' => 'Price suggestion test', 'guard_name' => 'web']);
        $role->givePermissionTo('valuations.create');
        $user = User::factory()->for(Agency::factory())->create();
        $user->assignRole($role);
        Sanctum::actingAs($user);

        return $user;
    }

    private function input(array $overrides = []): array
    {
        return array_merge([
            'purpose' => 'sale', 'city' => ['Cidade Teste'], 'neighborhood' => ['Centro'],
            'residential_type' => 'house', 'area' => 120, 'bedrooms' => 3,
            'bathrooms' => 2, 'garage_spaces' => 1, 'flood_risk' => false,
        ], $overrides);
    }

    private function comparable(array $overrides = []): MarketProperty
    {
        return MarketProperty::factory()->create(array_merge([
            'cidade' => 'Cidade Teste', 'bairro' => 'Centro', 'tipo' => 'Casa',
            'area' => 100, 'quartos' => 3, 'banheiros' => 2, 'vagas' => 1,
            'valor' => 600000, 'valor_aluguel' => null,
        ], $overrides));
    }
}
