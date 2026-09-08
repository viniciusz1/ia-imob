<?php

namespace Tests\Feature\Analytics;

use App\Domain\Analytics\MarketAnalyticsFilters;
use App\Domain\Analytics\PriceMetric;
use App\Models\CrawlerRun;
use App\Models\MarketProperty;
use App\Repositories\Analytics\MarketListingRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MarketListingRepositoryTest extends TestCase
{
    use RefreshDatabase;

    private MarketListingRepository $repository;

    protected function setUp(): void
    {
        parent::setUp();

        $this->repository = app(MarketListingRepository::class);
    }

    public function test_the_most_expensive_listings_come_first(): void
    {
        $run = CrawlerRun::factory()->create();

        foreach ([100000, 900000, 500000] as $price) {
            MarketProperty::factory()->create([
                'crawler_run_id' => $run->id,
                'valor' => $price,
                'area' => 100,
                'tipo' => 'Casa',
                'bairro' => 'Centro',
            ]);
        }

        $listings = $this->repository->rankedBy(
            MarketAnalyticsFilters::fromArray([]),
            PriceMetric::AnnouncedPrice,
            'desc',
            2,
        );

        $this->assertCount(2, $listings);
        $this->assertSame(900000.0, $listings[0]['price']);
        $this->assertSame(500000.0, $listings[1]['price']);
        $this->assertSame('Casa', $listings[0]['type']);
        $this->assertSame(9000.0, $listings[0]['price_per_square_metre']);
        $this->assertNotNull($listings[0]['agency']);
    }

    public function test_the_cheapest_listing_ignores_values_outside_the_fence(): void
    {
        $run = CrawlerRun::factory()->create();

        foreach ([100000, 110000, 120000, 130000, 140000, 150000] as $price) {
            MarketProperty::factory()->create(['crawler_run_id' => $run->id, 'valor' => $price]);
        }

        MarketProperty::factory()->create(['crawler_run_id' => $run->id, 'valor' => 200]);

        $listings = $this->repository->rankedBy(
            MarketAnalyticsFilters::fromArray([]),
            PriceMetric::AnnouncedPrice,
            'asc',
            1,
            withinFence: true,
        );

        $this->assertSame(100000.0, $listings[0]['price']);
    }

    public function test_ranking_by_square_metre_skips_records_without_area(): void
    {
        $run = CrawlerRun::factory()->create();
        MarketProperty::factory()->create(['crawler_run_id' => $run->id, 'valor' => 500000, 'area' => 50]);
        MarketProperty::factory()->create(['crawler_run_id' => $run->id, 'valor' => 900000, 'area' => null]);

        $listings = $this->repository->rankedBy(
            MarketAnalyticsFilters::fromArray([]),
            PriceMetric::PricePerSquareMetre,
            'desc',
            10,
        );

        $this->assertCount(1, $listings);
        $this->assertSame(10000.0, $listings[0]['price_per_square_metre']);
    }
}
