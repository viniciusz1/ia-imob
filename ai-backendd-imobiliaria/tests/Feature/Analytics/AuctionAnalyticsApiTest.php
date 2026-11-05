<?php

namespace Tests\Feature\Analytics;

use App\Domain\Analytics\StatisticalSummary;
use App\Models\Agency;
use App\Models\Crawler\CrawlAgency;
use App\Models\CrawlerRun;
use App\Models\MarketProperty;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class AuctionAnalyticsApiTest extends TestCase
{
    use RefreshDatabase;

    private const ENDPOINT = '/api/v1/analytics/auctions';

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

    public function test_it_compares_the_minimum_bid_with_the_appraisal_and_the_market(): void
    {
        $this->marketAt('Centro', squareMetrePrice: 5000);

        // Estimado pelo mercado: 100 m² x R$ 5.000 = R$ 500.000.
        $this->lot('Centro', area: 100, minimumBid: 300000, appraisal: 450000);
        $this->lot('Centro', area: 100, minimumBid: 600000, appraisal: 620000);

        $this->actingAs($this->userWithPermission())
            ->getJson(self::ENDPOINT)
            ->assertOk()
            ->assertJsonPath('data.total_lots.indicator', 'A4.01')
            ->assertJsonPath('data.total_lots.value', 2)
            ->assertJsonPath('data.with_appraisal.value', 2)
            ->assertJsonPath('data.median_minimum_bid.value', 450000)
            ->assertJsonPath('data.median_appraisal.value', 535000)
            ->assertJsonPath('data.compared_to_market.value', 2)
            ->assertJsonPath('data.below_market.value', 1)
            ->assertJsonPath('data.below_market_share.value', 0.5)
            ->assertJsonPath('data.opportunities.items.0.minimum_bid', 300000)
            ->assertJsonPath('data.opportunities.items.0.market_estimate', 500000)
            ->assertJsonPath('data.opportunities.items.0.market_gap', 0.4)
            ->assertJsonPath('data.opportunities.items.0.discount', 0.3333)
            ->assertJsonPath('data.opportunities.items.0.neighbourhood', 'Centro')
            ->assertJsonStructure([
                'data' => ['by_modality', 'by_type', 'by_neighbourhood', 'opportunities'],
                'meta' => ['generated_at', 'data_reference_date'],
            ]);
    }

    public function test_lots_without_a_market_reference_keep_the_appraisal_discount(): void
    {
        $this->lot('Bairro Sem Oferta', area: 100, minimumBid: 200000, appraisal: 400000);

        $this->actingAs($this->userWithPermission())
            ->getJson(self::ENDPOINT)
            ->assertOk()
            ->assertJsonPath('data.compared_to_market.value', 0)
            ->assertJsonPath('data.below_market.value', 0)
            ->assertJsonPath('data.below_market_share.value', null)
            ->assertJsonPath('data.median_discount.value', 0.5)
            ->assertJsonPath('data.opportunities.items.0.market_estimate', null)
            ->assertJsonPath('data.opportunities.items.0.discount', 0.5);
    }

    public function test_the_general_filters_narrow_the_lots(): void
    {
        $this->lot('Centro', area: 100, minimumBid: 200000, appraisal: 400000, city: 'Jaraguá do Sul');
        $this->lot('Centro', area: 100, minimumBid: 200000, appraisal: 400000, city: 'Joinville');
        $this->lot('Vila Nova', area: 100, minimumBid: 200000, appraisal: 400000, city: 'Jaraguá do Sul');

        $user = $this->userWithPermission();

        $this->actingAs($user)
            ->getJson(self::ENDPOINT.'?cidade=Jaragu%C3%A1%20do%20Sul')
            ->assertOk()
            ->assertJsonPath('data.total_lots.value', 2);

        $this->actingAs($user)
            ->getJson(self::ENDPOINT.'?cidade=Jaragu%C3%A1%20do%20Sul&bairro[]=Centro')
            ->assertOk()
            ->assertJsonPath('data.total_lots.value', 1);

        $this->actingAs($user)
            ->getJson(self::ENDPOINT.'?tipo[]=Apartamento')
            ->assertOk()
            ->assertJsonPath('data.total_lots.value', 0);
    }

    public function test_an_empty_inventory_returns_neutral_indicators(): void
    {
        $this->actingAs($this->userWithPermission())
            ->getJson(self::ENDPOINT)
            ->assertOk()
            ->assertJsonPath('data.total_lots.value', 0)
            ->assertJsonPath('data.median_minimum_bid.value', null)
            ->assertJsonPath('data.below_market_share.value', null)
            ->assertJsonPath('data.opportunities.items', [])
            ->assertJsonPath('meta.data_reference_date', null);
    }

    /**
     * Oferta de mercado suficiente para o bairro ter mediana de R$/m².
     */
    private function marketAt(string $neighbourhood, float $squareMetrePrice): void
    {
        $run = CrawlerRun::factory()->create();

        for ($index = 0; $index < StatisticalSummary::MINIMUM_SAMPLE; $index++) {
            MarketProperty::factory()->create([
                'crawler_run_id' => $run->id,
                'bairro' => $neighbourhood,
                'area' => 100,
                'valor' => $squareMetrePrice * 100,
            ]);
        }
    }

    private function lot(
        string $neighbourhood,
        float $area,
        float $minimumBid,
        ?float $appraisal,
        string $city = 'Jaraguá do Sul',
        string $propertyType = 'house',
    ): void {
        $eventId = DB::table('auction_events')->insertGetId([
            'crawl_agency_id' => $this->crawlAgencyId(),
            'external_key' => fake()->unique()->uuid(),
            'title' => 'Leilão judicial',
            'sale_modality' => 'judicial',
            'status' => 'open',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $propertyId = DB::table('auction_properties')->insertGetId([
            'property_key' => fake()->unique()->uuid(),
            'property_type' => $propertyType,
            'title' => "Lote em {$neighbourhood}",
            'city' => $city,
            'neighborhood' => $neighbourhood,
            'state' => 'SC',
            'built_area_m2' => $area,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $lotId = DB::table('auction_event_properties')->insertGetId([
            'auction_event_id' => $eventId,
            'auction_property_id' => $propertyId,
            'lot_number' => (string) fake()->unique()->numberBetween(1, 100000),
            'inventory_state' => 'published',
            'observed_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $roundId = DB::table('auction_rounds')->insertGetId([
            'auction_event_property_id' => $lotId,
            'round_number' => 1,
            'starts_at' => now()->addDays(10),
            'appraisal_value' => $appraisal,
            'minimum_bid' => $minimumBid,
            'status' => 'scheduled',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('auction_event_properties')->where('id', $lotId)->update(['current_round_id' => $roundId]);
    }

    private function crawlAgencyId(): int
    {
        return CrawlAgency::query()->create([
            'name' => fake()->company(),
            'slug' => fake()->unique()->slug(),
            'base_url' => fake()->unique()->url(),
            'root_domain' => fake()->unique()->domainName(),
            'lifecycle_state' => 'active',
        ])->id;
    }

    private function userWithPermission(): User
    {
        $user = User::factory()->for(Agency::factory())->create();
        $user->givePermissionTo(Permission::findOrCreate('analytics.market.view', 'web'));

        return $user;
    }
}
