<?php

namespace Tests\Feature\Analytics;

use App\Domain\Analytics\MarketAnalyticsFilters;
use App\Models\CrawlerRun;
use App\Models\MarketProperty;
use App\Repositories\Analytics\MarketSupplyRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MarketSupplyRepositoryTest extends TestCase
{
    use RefreshDatabase;

    private MarketSupplyRepository $repository;

    private MarketAnalyticsFilters $everything;

    protected function setUp(): void
    {
        parent::setUp();

        $this->repository = app(MarketSupplyRepository::class);
        $this->everything = MarketAnalyticsFilters::fromArray([]);
    }

    public function test_the_total_counts_the_published_stock(): void
    {
        $run = CrawlerRun::factory()->create();
        MarketProperty::factory()->count(3)->create(['crawler_run_id' => $run->id]);

        $this->assertSame(3, $this->repository->total($this->everything));
    }

    public function test_an_empty_market_totals_zero(): void
    {
        $this->assertSame(0, $this->repository->total($this->everything));
    }

    public function test_the_reference_date_is_the_latest_publication(): void
    {
        CrawlerRun::factory()->create(['published_at' => '2026-08-01 22:32:00']);
        $latest = CrawlerRun::factory()->create(['published_at' => '2026-08-05 10:00:00']);
        MarketProperty::factory()->create(['crawler_run_id' => $latest->id]);

        $this->assertSame(
            '2026-08-05',
            $this->repository->referenceDate($this->everything)?->toDateString(),
        );
    }
}
