<?php

namespace Tests\Feature;

use App\Models\Agency;
use App\Models\MarketProperty;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class RentalValuationCalculationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->app[PermissionRegistrar::class]->forgetCachedPermissions();
        Permission::firstOrCreate(['name' => 'valuations.create', 'guard_name' => 'web']);
        $user = User::factory()->for(Agency::factory())->create();
        $user->givePermissionTo('valuations.create');
        Sanctum::actingAs($user);
    }

    public static function calculationModes(): array
    {
        return [
            'automatic' => [false, false, [2812.35, 4374.76, 5937.17]],
            'reviewed' => [true, false, [2812.35, 4374.76, 5937.17]],
            'automatic with flood adjustment' => [false, true, [1968.64, 3062.33, 4156.02]],
            'reviewed with flood adjustment' => [true, true, [1968.64, 3062.33, 4156.02]],
        ];
    }

    #[DataProvider('calculationModes')]
    public function test_rent_uses_area_normalization_and_interpolated_percentiles(bool $reviewed, bool $floodRisk, array $expected): void
    {
        // Rent/m²: 10.125, 20.25, 30.375, 40.5, 50.625, 60.75.
        // P25=22.78125, median=35.4375, P75=48.09375; subject area=123.45.
        $properties = [];
        foreach ([[80, 810], [100, 2025], [120, 3645], [80, 3240], [80, 4050], [100, 6075]] as [$area, $rent]) {
            $properties[] = $this->comparable(['area' => $area, 'valor_aluguel' => $rent]);
        }

        $payload = $this->payload(['area' => 123.45, 'flood_risk' => $floodRisk]);
        if ($reviewed) {
            $payload['comparable_reviews'] = array_map(
                fn (MarketProperty $property): array => ['market_property_id' => $property->id, 'status' => 'approved'],
                $properties,
            );
            $rejected = $this->comparable(['valor_aluguel' => 999999]);
            $payload['comparable_reviews'][] = ['market_property_id' => $rejected->id, 'status' => 'rejected'];
        }

        $response = $this->postJson('/api/v1/valuations', $payload)->assertCreated()
            ->assertJsonPath('data.status', 'calculated')
            ->assertJsonPath('data.base_range.min', 2812.35)
            ->assertJsonPath('data.base_range.central', 4374.76)
            ->assertJsonPath('data.base_range.max', 5937.17)
            ->assertJsonPath('data.final_range.min', $expected[0])
            ->assertJsonPath('data.final_range.central', $expected[1])
            ->assertJsonPath('data.final_range.max', $expected[2])
            ->assertJsonPath('data.sample_summary.used_count', 6);

        $evidence = collect($response->json('data.comparable_evidence'))->keyBy('market_property_id');
        $this->assertEqualsWithDelta(10.125, $evidence[$properties[0]->id]['price_per_square_meter'], 0.000001);
        if ($reviewed) {
            $response->assertJsonPath('data.sample_summary.rejected_count', 1);
            $this->assertSame('rejected', $evidence[$rejected->id]['review_status']);
        }
    }

    public function test_rental_outliers_are_removed_before_calculating_the_range(): void
    {
        foreach ([1, 20, 21, 22, 23, 24, 25, 26, 27, 1000] as $pricePerSquareMeter) {
            $this->comparable(['valor_aluguel' => $pricePerSquareMeter * 100]);
        }
        $this->postJson('/api/v1/valuations', $this->payload())->assertCreated()
            ->assertJsonPath('data.sample_summary.outlier_count', 2)
            ->assertJsonPath('data.sample_summary.used_count', 8)
            ->assertJsonPath('data.final_range.min', 2175)
            ->assertJsonPath('data.final_range.central', 2350)
            ->assertJsonPath('data.final_range.max', 2525);
    }

    public function test_rental_bathroom_relaxation_keeps_the_same_price_basis(): void
    {
        foreach ([2000, 2200, 2400, 2600, 2800] as $rent) {
            $this->comparable(['valor_aluguel' => $rent, 'banheiros' => 3]);
        }
        $this->postJson('/api/v1/valuations', $this->payload(['area' => 120]))->assertCreated()
            ->assertJsonPath('data.sample_summary.bathrooms_relaxed', true)
            ->assertJsonPath('data.final_range.min', 2640)
            ->assertJsonPath('data.final_range.central', 2880)
            ->assertJsonPath('data.final_range.max', 3120);
    }

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'purpose' => 'rent', 'city' => ['Cidade Teste'], 'neighborhood' => ['Centro'],
            'residential_type' => 'house', 'area' => 100, 'bedrooms' => 3,
            'bathrooms' => 2, 'garage_spaces' => 1, 'flood_risk' => false,
        ], $overrides);
    }

    private function comparable(array $overrides): MarketProperty
    {
        return MarketProperty::factory()->create(array_merge([
            'cidade' => 'Cidade Teste', 'bairro' => 'Centro', 'tipo' => 'Casa',
            'area' => 100, 'quartos' => 3, 'banheiros' => 2, 'vagas' => 1,
            'valor' => 900000, 'valor_aluguel' => 2000,
        ], $overrides));
    }
}
