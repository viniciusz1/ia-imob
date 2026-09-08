<?php

namespace Tests\Feature\Analytics;

use App\Domain\Analytics\FixedRanges;
use App\Domain\Analytics\LabelledCount;
use App\Domain\Analytics\MarketAnalyticsFilters;
use App\Domain\Analytics\PropertyTypeNormalizer;
use App\Domain\Analytics\SupplyDimension;
use App\Domain\Analytics\SupplyField;
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

    public function test_counts_by_dimension_come_ordered_by_size(): void
    {
        $run = CrawlerRun::factory()->create();
        MarketProperty::factory()->count(3)->create(['crawler_run_id' => $run->id, 'cidade' => 'Jaraguá do Sul']);
        MarketProperty::factory()->create(['crawler_run_id' => $run->id, 'cidade' => 'Guaramirim']);

        $cities = $this->repository->countBy($this->everything, SupplyDimension::City);

        $this->assertSame(4, $this->repository->total($this->everything));
        $this->assertSame('Jaraguá do Sul', $cities->first()->label);
        $this->assertSame(3, $cities->first()->count);
        $this->assertSame(0.75, $cities->first()->toArray(4)['share']);
    }

    public function test_types_are_counted_by_their_canonical_name(): void
    {
        $run = CrawlerRun::factory()->create();
        MarketProperty::factory()->create(['crawler_run_id' => $run->id, 'tipo' => 'Casa']);
        MarketProperty::factory()->create(['crawler_run_id' => $run->id, 'tipo' => 'casa residencial']);
        MarketProperty::factory()->count(3)->create(['crawler_run_id' => $run->id, 'tipo' => 'C']);

        $types = $this->repository->countByCanonicalType($this->everything)
            ->mapWithKeys(fn (LabelledCount $type): array => [$type->label => $type->count]);

        $this->assertSame(2, $types['Casa']);
        $this->assertSame(3, $types[PropertyTypeNormalizer::UNCLASSIFIED]);
    }

    public function test_range_counts_place_each_record_in_a_single_bucket(): void
    {
        $run = CrawlerRun::factory()->create();

        foreach ([150000, 199999, 200000, 2500000] as $price) {
            MarketProperty::factory()->create(['crawler_run_id' => $run->id, 'valor' => $price]);
        }

        $counts = $this->repository->countByRange($this->everything, SupplyField::Price, FixedRanges::price());

        $this->assertSame(2, $counts['ate-200k']);
        $this->assertSame(1, $counts['200k-350k']);
        $this->assertSame(1, $counts['acima-2m']);
        $this->assertSame(4, $counts->sum());
    }

    public function test_cardinal_counts_are_indexed_by_value(): void
    {
        $run = CrawlerRun::factory()->create();
        MarketProperty::factory()->count(2)->create(['crawler_run_id' => $run->id, 'quartos' => 3]);
        MarketProperty::factory()->create(['crawler_run_id' => $run->id, 'quartos' => 7]);
        MarketProperty::factory()->create(['crawler_run_id' => $run->id, 'quartos' => null]);

        $counts = $this->repository->countByCardinal($this->everything, SupplyField::Bedrooms);

        $this->assertSame(2, $counts[3]);
        $this->assertSame(1, $counts[7]);
        $this->assertSame(3, $counts->sum());
    }

    public function test_filled_counts_ignore_missing_values(): void
    {
        $run = CrawlerRun::factory()->create();
        MarketProperty::factory()->create(['crawler_run_id' => $run->id, 'area' => 90, 'ano_construcao' => null]);
        MarketProperty::factory()->create(['crawler_run_id' => $run->id, 'area' => null, 'ano_construcao' => null]);

        $filled = $this->repository->countFilled($this->everything, [
            SupplyField::Price,
            SupplyField::Area,
            SupplyField::ConstructionYear,
        ]);

        $this->assertSame(2, $filled['price']);
        $this->assertSame(1, $filled['area']);
        $this->assertSame(0, $filled['construction_year']);
    }
}
