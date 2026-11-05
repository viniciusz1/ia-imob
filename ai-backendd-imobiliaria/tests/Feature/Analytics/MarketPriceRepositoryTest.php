<?php

namespace Tests\Feature\Analytics;

use App\Domain\Analytics\MarketAnalyticsFilters;
use App\Domain\Analytics\PriceMetric;
use App\Domain\Analytics\PropertyTypeNormalizer;
use App\Domain\Analytics\StatisticalSummary;
use App\Domain\Analytics\SupplyDimension;
use App\Models\CrawlerRun;
use App\Models\MarketProperty;
use App\Repositories\Analytics\MarketPriceRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MarketPriceRepositoryTest extends TestCase
{
    use RefreshDatabase;

    private MarketPriceRepository $repository;

    protected function setUp(): void
    {
        parent::setUp();

        $this->repository = app(MarketPriceRepository::class);
    }

    public function test_median_and_quartiles_describe_the_sample(): void
    {
        $this->createPricedProperties([100000, 200000, 300000, 400000, 500000]);

        $summary = $this->summarize();

        $this->assertSame(5, $summary->sampleSize);
        $this->assertFalse($summary->isInsufficient());
        $this->assertSame(300000.0, $summary->median);
        $this->assertSame(300000.0, $summary->average);
        $this->assertSame(200000.0, $summary->firstQuartile);
        $this->assertSame(400000.0, $summary->thirdQuartile);
    }

    public function test_values_outside_the_interquartile_fence_are_discarded(): void
    {
        $this->createPricedProperties([100000, 110000, 120000, 130000, 140000, 150000, 38000000]);

        $summary = $this->summarize();

        $this->assertSame(6, $summary->sampleSize);
        $this->assertSame(1, $summary->outliersDiscarded);
        $this->assertSame(125000.0, $summary->median);
    }

    public function test_samples_below_the_minimum_do_not_report_price(): void
    {
        $this->createPricedProperties([100000, 200000, 300000, 400000]);

        $summary = $this->summarize();

        $this->assertSame(4, $summary->sampleSize);
        $this->assertTrue($summary->isInsufficient());
        $this->assertNull($summary->median);
        $this->assertNull($summary->average);
    }

    public function test_empty_samples_do_not_report_price(): void
    {
        $summary = $this->summarize();

        $this->assertSame(0, $summary->sampleSize);
        $this->assertTrue($summary->isInsufficient());
        $this->assertNull($summary->median);
    }

    public function test_price_per_square_metre_is_computed_record_by_record(): void
    {
        $run = CrawlerRun::factory()->create();

        foreach ([[500000, 100], [600000, 100], [700000, 100], [800000, 100], [900000, 100]] as [$price, $area]) {
            MarketProperty::factory()->create([
                'crawler_run_id' => $run->id,
                'valor' => $price,
                'area' => $area,
            ]);
        }

        MarketProperty::factory()->create(['crawler_run_id' => $run->id, 'valor' => 900000, 'area' => null]);

        $summary = $this->repository->summarize(
            MarketAnalyticsFilters::fromArray([]),
            PriceMetric::PricePerSquareMetre,
        );

        $this->assertSame(5, $summary->sampleSize);
        $this->assertSame(7000.0, $summary->median);
    }

    public function test_grouped_summary_applies_the_rules_per_group(): void
    {
        $run = CrawlerRun::factory()->create();

        foreach ([100000, 200000, 300000, 400000, 500000] as $price) {
            MarketProperty::factory()->create([
                'crawler_run_id' => $run->id,
                'bairro' => 'Centro',
                'valor' => $price,
            ]);
        }

        MarketProperty::factory()->count(2)->create([
            'crawler_run_id' => $run->id,
            'bairro' => 'Amizade',
            'valor' => 900000,
        ]);

        $groups = $this->repository->summarizeBy(
            MarketAnalyticsFilters::fromArray([]),
            PriceMetric::AnnouncedPrice,
            SupplyDimension::Neighbourhood,
        );

        $this->assertSame(300000.0, $groups['Centro']->median);
        $this->assertFalse($groups['Centro']->isInsufficient());
        $this->assertTrue($groups['Amizade']->isInsufficient());
        $this->assertNull($groups['Amizade']->median);
        $this->assertSame(2, $groups['Amizade']->sampleSize);
    }

    public function test_grouping_by_type_uses_the_canonical_name(): void
    {
        $run = CrawlerRun::factory()->create();

        foreach ([300000, 400000, 500000] as $price) {
            MarketProperty::factory()->create(['crawler_run_id' => $run->id, 'tipo' => 'Casa', 'valor' => $price]);
        }

        foreach ([600000, 700000] as $price) {
            MarketProperty::factory()->create(['crawler_run_id' => $run->id, 'tipo' => 'casa residencial', 'valor' => $price]);
        }

        MarketProperty::factory()->create(['crawler_run_id' => $run->id, 'tipo' => 'Baependi', 'valor' => 900000]);

        $groups = $this->repository->summarizeBy(
            MarketAnalyticsFilters::fromArray([]),
            PriceMetric::AnnouncedPrice,
            SupplyDimension::Type,
        );

        $this->assertSame(5, $groups['Casa']->sampleSize);
        $this->assertSame(500000.0, $groups['Casa']->median);
        $this->assertSame(1, $groups[PropertyTypeNormalizer::UNCLASSIFIED]->sampleSize);
    }

    private function summarize(): StatisticalSummary
    {
        return $this->repository->summarize(
            MarketAnalyticsFilters::fromArray([]),
            PriceMetric::AnnouncedPrice,
        );
    }

    /**
     * @param  list<int>  $prices
     */
    private function createPricedProperties(array $prices): void
    {
        $run = CrawlerRun::factory()->create();

        foreach ($prices as $price) {
            MarketProperty::factory()->create([
                'crawler_run_id' => $run->id,
                'valor' => $price,
            ]);
        }
    }
}
