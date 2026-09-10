<?php

namespace Tests\Feature\Analytics;

use App\Domain\Analytics\MarketAnalyticsFilters;
use App\Models\CrawlerRun;
use App\Models\MarketProperty;
use App\Services\Analytics\MarketOverviewService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MarketOverviewServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_overview_counts_the_published_stock(): void
    {
        $run = CrawlerRun::factory()->create();

        MarketProperty::factory()->count(2)->create(['crawler_run_id' => $run->id]);

        $data = $this->handle();

        $this->assertSame('A1.01', $data['total_supply']['indicator']);
        $this->assertSame(2, $data['total_supply']['value']);
    }

    public function test_an_empty_market_reports_no_supply(): void
    {
        $this->assertSame(0, $this->handle()['total_supply']['value']);
    }

    /**
     * @return array<string, mixed>
     */
    private function handle(): array
    {
        return app(MarketOverviewService::class)->handle(
            MarketAnalyticsFilters::fromArray([]),
        );
    }
}
