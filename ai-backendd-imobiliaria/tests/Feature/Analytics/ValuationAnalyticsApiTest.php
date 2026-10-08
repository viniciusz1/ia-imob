<?php

namespace Tests\Feature\Analytics;

use App\Models\Agency;
use App\Models\PropertyValuation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class ValuationAnalyticsApiTest extends TestCase
{
    use RefreshDatabase;

    private const ENDPOINT = '/api/v1/analytics/valuations';

    public function test_the_endpoint_requires_authentication(): void
    {
        $this->getJson(self::ENDPOINT)->assertUnauthorized();
    }

    public function test_a_user_without_the_permission_is_rejected(): void
    {
        $this->actingAs(User::factory()->for(Agency::factory())->create())
            ->getJson(self::ENDPOINT)
            ->assertForbidden();
    }

    public function test_it_reports_the_agency_valuation_indicators(): void
    {
        $user = $this->userWithPermission('Ana');
        $colleague = User::factory()->create(['agency_id' => $user->agency_id, 'name' => 'Bruno']);

        $this->valuation($user, ['Centro'], 'house', 100, 400000, '2026-08-10 12:00:00');
        $this->valuation($user, ['Centro'], 'apartment', 50, 300000, '2026-09-05 12:00:00');
        $this->valuation($colleague, ['Vila Nova'], 'house', 200, 500000, '2026-09-06 12:00:00');
        $this->valuation($colleague, ['Centro'], 'house', 80, null, '2026-09-07 12:00:00');

        $this->valuation(User::factory()->for(Agency::factory())->create(), ['Centro'], 'house', 100, 999999, '2026-09-07 12:00:00');

        $this->actingAs($user)
            ->getJson(self::ENDPOINT)
            ->assertOk()
            ->assertJsonPath('data.total.indicator', 'A3.01')
            ->assertJsonPath('data.total.value', 4)
            ->assertJsonPath('data.calculated.value', 3)
            ->assertJsonPath('data.insufficient_sample.value', 1)
            ->assertJsonPath('data.calculated_share.value', 0.75)
            ->assertJsonPath('data.median_value.value', 400000)
            ->assertJsonPath('data.average_value.value', 400000)
            ->assertJsonPath('data.median_price_per_square_metre.value', 4000)
            ->assertJsonPath('data.by_type.items.0', ['label' => 'Casa', 'count' => 3, 'median_value' => 450000])
            ->assertJsonPath('data.by_neighbourhood.items.0', ['label' => 'Centro', 'count' => 3, 'median_value' => 350000])
            ->assertJsonPath('data.by_month.items', [
                ['label' => '2026-08', 'count' => 1],
                ['label' => '2026-09', 'count' => 3],
            ])
            ->assertJsonPath('data.by_user.items.0.label', 'Ana')
            ->assertJsonPath('data.by_user.items.1.label', 'Bruno')
            ->assertJsonStructure(['meta' => ['generated_at', 'data_reference_date']]);
    }

    public function test_the_period_filter_narrows_the_valuations(): void
    {
        $user = $this->userWithPermission('Ana');
        $this->valuation($user, ['Centro'], 'house', 100, 400000, '2026-08-10 12:00:00');
        $this->valuation($user, ['Centro'], 'house', 100, 400000, '2026-09-10 12:00:00');

        $this->actingAs($user)
            ->getJson(self::ENDPOINT.'?data_inicio=2026-09-01&data_fim=2026-09-30')
            ->assertOk()
            ->assertJsonPath('data.total.value', 1);
    }

    public function test_legacy_valuations_with_a_scalar_neighbourhood_are_grouped(): void
    {
        $user = $this->userWithPermission('Ana');
        $valuation = $this->valuation($user, ['Centro'], 'house', 100, 400000, '2026-09-10 12:00:00');
        DB::table('property_valuations')->where('id', $valuation->id)->update(['neighborhood' => '"Baependi"']);

        $this->actingAs($user)
            ->getJson(self::ENDPOINT)
            ->assertOk()
            ->assertJsonPath('data.by_neighbourhood.items.0.label', 'Baependi');
    }

    public function test_an_agency_without_valuations_gets_empty_indicators(): void
    {
        $this->actingAs($this->userWithPermission('Ana'))
            ->getJson(self::ENDPOINT)
            ->assertOk()
            ->assertJsonPath('data.total.value', 0)
            ->assertJsonPath('data.calculated_share.value', null)
            ->assertJsonPath('data.median_value.value', null)
            ->assertJsonPath('data.by_type.items', [])
            ->assertJsonPath('meta.data_reference_date', null);
    }

    private function userWithPermission(string $name): User
    {
        $user = User::factory()->for(Agency::factory())->create(['name' => $name]);
        $user->givePermissionTo(Permission::findOrCreate('analytics.market.view', 'web'));

        return $user;
    }

    /**
     * @param  list<string>  $neighbourhood
     */
    private function valuation(
        User $user,
        array $neighbourhood,
        string $type,
        float $area,
        ?float $centralValue,
        string $createdAt,
    ): PropertyValuation {
        $valuation = new PropertyValuation([
            'agency_id' => $user->agency_id,
            'user_id' => $user->id,
            'code' => 'AVL-'.uniqid(),
            'status' => $centralValue === null
                ? PropertyValuation::STATUS_INSUFFICIENT_SAMPLE
                : PropertyValuation::STATUS_CALCULATED,
            'city' => ['Jaraguá do Sul'],
            'neighborhood' => $neighbourhood,
            'residential_type' => $type,
            'area' => $area,
            'bedrooms' => 2,
            'bathrooms' => 1,
            'garage_spaces' => 1,
            'final_central_value' => $centralValue,
        ]);
        $valuation->created_at = $createdAt;
        $valuation->save();

        return $valuation;
    }
}
