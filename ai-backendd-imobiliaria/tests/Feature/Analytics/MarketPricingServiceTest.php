<?php

namespace Tests\Feature\Analytics;

use App\Domain\Analytics\MarketAnalyticsFilters;
use App\Models\CrawlerRun;
use App\Models\MarketProperty;
use App\Services\Analytics\MarketPricingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MarketPricingServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_headline_prices_report_median_average_and_central_range(): void
    {
        $run = CrawlerRun::factory()->create();

        foreach ([100000, 200000, 300000, 400000, 500000] as $price) {
            MarketProperty::factory()->create([
                'crawler_run_id' => $run->id,
                'valor' => $price,
                'area' => 100,
            ]);
        }

        $data = $this->handle();

        $this->assertSame(300000.0, $data['median_price']['value']);
        $this->assertSame('A2.01', $data['median_price']['indicator']);
        $this->assertSame(300000.0, $data['average_price']['value']);
        $this->assertSame(200000.0, $data['central_price_range']['p25']);
        $this->assertSame(400000.0, $data['central_price_range']['p75']);
        $this->assertSame(3000.0, $data['median_price_per_square_metre']['value']);
        $this->assertFalse($data['median_price']['insufficient_sample']);
    }

    public function test_a_small_market_reports_no_price(): void
    {
        $run = CrawlerRun::factory()->create();
        MarketProperty::factory()->count(3)->create(['crawler_run_id' => $run->id, 'valor' => 250000]);

        $data = $this->handle();

        $this->assertNull($data['median_price']['value']);
        $this->assertTrue($data['median_price']['insufficient_sample']);
        $this->assertSame(3, $data['median_price']['sample_size']);
    }

    public function test_prices_are_broken_down_by_type_and_bedrooms(): void
    {
        $run = CrawlerRun::factory()->create();

        foreach ([300000, 400000, 500000, 600000, 700000] as $price) {
            MarketProperty::factory()->create([
                'crawler_run_id' => $run->id,
                'tipo' => 'Casa',
                'quartos' => 3,
                'valor' => $price,
                'area' => 100,
            ]);
        }

        $data = $this->handle();

        $byType = collect($data['by_type']['items'])->keyBy('label');
        $this->assertSame(500000.0, $byType['Casa']['median']);
        $this->assertSame(5000.0, $byType['Casa']['median_per_square_metre']);

        $byBedrooms = collect($data['by_bedrooms']['items'])->keyBy('label');
        $this->assertSame(500000.0, $byBedrooms['3']['median']);
    }

    public function test_neighbourhood_dispersion_is_reported_with_its_sample(): void
    {
        $run = CrawlerRun::factory()->create();

        foreach ([100000, 200000, 300000, 400000, 500000] as $price) {
            MarketProperty::factory()->create([
                'crawler_run_id' => $run->id,
                'bairro' => 'Centro',
                'valor' => $price,
            ]);
        }

        $dispersion = collect($this->handle()['dispersion_by_neighbourhood']['items'])->keyBy('label');

        $this->assertSame(0.5270, $dispersion['Centro']['variation']);
        $this->assertFalse($dispersion['Centro']['insufficient_sample']);
    }

    /**
     * @return array<string, mixed>
     */
    private function handle(): array
    {
        return app(MarketPricingService::class)->handle(MarketAnalyticsFilters::fromArray([]));
    }
}
