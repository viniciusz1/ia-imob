<?php

namespace Tests\Feature\Analytics;

use App\Domain\Analytics\MarketAnalyticsFilters;
use App\Models\Crawler\ListingIdentity;
use App\Models\CrawlerRun;
use App\Models\MarketProperty;
use App\Repositories\Analytics\MarketStockQuery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MarketStockQueryTest extends TestCase
{
    use RefreshDatabase;

    private MarketStockQuery $query;

    protected function setUp(): void
    {
        parent::setUp();

        $this->query = new MarketStockQuery;
    }

    public function test_only_published_snapshots_reach_the_stock(): void
    {
        $published = CrawlerRun::factory()->create();
        $quarantined = CrawlerRun::factory()->create(['publication_state' => 'quarantined']);

        MarketProperty::factory()->count(3)->create(['crawler_run_id' => $published->id]);
        MarketProperty::factory()->count(2)->create(['crawler_run_id' => $quarantined->id]);

        $this->assertSame(3, $this->stockCount());
    }

    public function test_a_property_referenced_by_two_identities_is_counted_once(): void
    {
        $run = CrawlerRun::factory()->create();
        $property = MarketProperty::factory()->create(['crawler_run_id' => $run->id]);

        ListingIdentity::query()->create([
            'crawl_agency_id' => $run->crawl_agency_id,
            'listing_key' => 'duplicate-identity',
            'inventory_state' => 'active',
            'current_market_property_id' => $property->id,
            'last_seen_crawl_run_id' => $run->id,
            'last_observed_at' => now(),
        ]);

        $this->assertSame(1, $this->stockCount());
    }

    public function test_price_and_area_variants_drop_records_without_the_field(): void
    {
        $run = CrawlerRun::factory()->create();
        MarketProperty::factory()->create(['crawler_run_id' => $run->id, 'valor' => 500000, 'area' => 100]);
        MarketProperty::factory()->create(['crawler_run_id' => $run->id, 'valor' => 500000, 'area' => null]);
        MarketProperty::factory()->create(['crawler_run_id' => $run->id, 'valor' => null, 'area' => 100]);

        $filters = MarketAnalyticsFilters::fromArray([]);

        $this->assertSame(3, $this->query->stock($filters)->count());
        $this->assertSame(2, $this->query->priced($filters)->count());
        $this->assertSame(1, $this->query->pricedWithArea($filters)->count());
    }

    public function test_filters_narrow_the_stock(): void
    {
        $run = CrawlerRun::factory()->create();
        MarketProperty::factory()->create([
            'crawler_run_id' => $run->id,
            'cidade' => 'Jaraguá do Sul',
            'tipo' => 'Casa',
            'quartos' => 6,
            'valor' => 900000,
            'area' => 180,
        ]);
        MarketProperty::factory()->create([
            'crawler_run_id' => $run->id,
            'cidade' => 'Guaramirim',
            'tipo' => 'apto',
            'quartos' => 2,
            'valor' => 300000,
            'area' => 60,
        ]);

        $this->assertSame(1, $this->stockCount(['cidade' => 'Jaraguá do Sul']));
        $this->assertSame(1, $this->stockCount(['tipo' => ['Apartamento']]));
        $this->assertSame(1, $this->stockCount(['quartos' => [5]]));
        $this->assertSame(1, $this->stockCount(['quartos' => [2]]));
        $this->assertSame(1, $this->stockCount(['min' => 500000]));
        $this->assertSame(1, $this->stockCount(['area_max' => 100]));
        $this->assertSame(0, $this->stockCount(['cidade' => 'Joinville']));
    }

    public function test_reference_date_is_the_latest_publication(): void
    {
        CrawlerRun::factory()->create(['published_at' => '2026-08-01 22:32:00']);
        $latest = CrawlerRun::factory()->create(['published_at' => '2026-08-05 10:00:00']);
        MarketProperty::factory()->create(['crawler_run_id' => $latest->id]);

        $this->assertSame(
            '2026-08-05',
            $this->query->referenceDate(MarketAnalyticsFilters::fromArray([]))?->toDateString(),
        );
    }

    /**
     * @param  array<string, mixed>  $input
     */
    private function stockCount(array $input = []): int
    {
        return $this->query->stock(MarketAnalyticsFilters::fromArray($input))->count();
    }
}
