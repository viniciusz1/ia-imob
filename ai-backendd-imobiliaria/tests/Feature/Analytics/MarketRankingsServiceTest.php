<?php

namespace Tests\Feature\Analytics;

use App\Domain\Analytics\MarketAnalyticsFilters;
use App\Models\CrawlerRun;
use App\Models\MarketProperty;
use App\Services\Analytics\MarketRankingsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MarketRankingsServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_neighbourhoods_are_ranked_from_the_most_to_the_least_expensive(): void
    {
        $run = CrawlerRun::factory()->create();

        $this->createNeighbourhood($run->id, 'Amizade', [800000, 850000, 900000, 950000, 1000000]);
        $this->createNeighbourhood($run->id, 'Centro', [200000, 250000, 300000, 350000, 400000]);
        $this->createNeighbourhood($run->id, 'Vila Nova', [500000, 550000]);

        $data = $this->handle();

        $ranking = $data['neighbourhoods_by_price']['items'];

        $this->assertSame('Amizade', $ranking[0]['label']);
        $this->assertSame('Centro', $ranking[1]['label']);
        $this->assertCount(2, $ranking);
    }

    public function test_the_neighbourhood_ranking_respects_the_requested_limit(): void
    {
        $run = CrawlerRun::factory()->create();
        $this->createNeighbourhood($run->id, 'Centro', [200000, 300000, 400000, 500000, 600000]);
        $this->createNeighbourhood($run->id, 'Amizade', [900000, 950000, 1000000, 1100000, 1200000]);

        $data = $this->handle(limit: 1);

        $this->assertCount(1, $data['neighbourhoods_by_price']['items']);
        $this->assertSame('Amizade', $data['neighbourhoods_by_price']['items'][0]['label']);
    }

    public function test_a_market_without_enough_records_has_no_neighbourhood_ranking(): void
    {
        $run = CrawlerRun::factory()->create();
        $this->createNeighbourhood($run->id, 'Centro', [200000, 300000]);

        $data = $this->handle();

        $this->assertSame([], $data['neighbourhoods_by_price']['items']);
    }

    /**
     * @param  list<int>  $prices
     */
    private function createNeighbourhood(int $runId, string $neighbourhood, array $prices): void
    {
        foreach ($prices as $price) {
            MarketProperty::factory()->create([
                'crawler_run_id' => $runId,
                'bairro' => $neighbourhood,
                'valor' => $price,
                'area' => 100,
            ]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function handle(int $limit = 10): array
    {
        return app(MarketRankingsService::class)->handle(MarketAnalyticsFilters::fromArray([]), $limit);
    }
}
