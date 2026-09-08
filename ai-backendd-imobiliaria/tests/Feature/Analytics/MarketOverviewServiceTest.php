<?php

namespace Tests\Feature\Analytics;

use App\Domain\Analytics\MarketAnalyticsFilters;
use App\Domain\Analytics\PropertyTypeNormalizer;
use App\Models\Crawler\CrawlAgency;
use App\Models\CrawlerRun;
use App\Models\MarketProperty;
use App\Services\Analytics\MarketOverviewService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MarketOverviewServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_supply_is_broken_down_by_location_type_and_characteristics(): void
    {
        $run = CrawlerRun::factory()->create();

        MarketProperty::factory()->create([
            'crawler_run_id' => $run->id,
            'cidade' => 'Jaraguá do Sul',
            'bairro' => 'Centro',
            'tipo' => 'Casa',
            'valor' => 180000,
            'area' => 45,
            'quartos' => 2,
            'vagas' => 1,
        ]);
        MarketProperty::factory()->create([
            'crawler_run_id' => $run->id,
            'cidade' => 'Jaraguá do Sul',
            'bairro' => 'Amizade',
            'tipo' => 'apto',
            'valor' => 2500000,
            'area' => 400,
            'quartos' => 7,
            'vagas' => 5,
        ]);

        $data = $this->handle();

        $this->assertSame(2, $data['total_supply']['value']);
        $this->assertSame('Jaraguá do Sul', $data['by_city']['items'][0]['label']);
        $this->assertSame(2, $data['by_city']['items'][0]['count']);
        $this->assertSame(1.0, $data['by_city']['items'][0]['share']);
        $this->assertCount(2, $data['by_neighbourhood']['items']);

        $types = array_column($data['by_type']['items'], 'count', 'label');
        $this->assertSame(1, $types['Casa']);
        $this->assertSame(1, $types['Apartamento']);

        $prices = array_column($data['by_price_range']['items'], 'count', 'key');
        $this->assertSame(1, $prices['ate-200k']);
        $this->assertSame(1, $prices['acima-2m']);

        $areas = array_column($data['by_area_range']['items'], 'count', 'key');
        $this->assertSame(1, $areas['ate-50']);
        $this->assertSame(1, $areas['acima-350']);

        $bedrooms = array_column($data['by_bedrooms']['items'], 'count', 'key');
        $this->assertSame(1, $bedrooms['2']);
        $this->assertSame(1, $bedrooms['5+']);

        $parking = array_column($data['by_parking_spaces']['items'], 'count', 'key');
        $this->assertSame(1, $parking['1']);
        $this->assertSame(1, $parking['3+']);
    }

    public function test_types_outside_the_catalog_are_grouped_as_unclassified(): void
    {
        $run = CrawlerRun::factory()->create();
        MarketProperty::factory()->count(2)->create(['crawler_run_id' => $run->id, 'tipo' => 'C']);

        $types = array_column($this->handle()['by_type']['items'], 'count', 'label');

        $this->assertSame(2, $types[PropertyTypeNormalizer::UNCLASSIFIED]);
    }

    public function test_agency_share_comes_from_the_snapshot_that_produced_the_record(): void
    {
        $itaivan = CrawlAgency::query()->create([
            'name' => 'ITAIVAN Imobiliária',
            'slug' => 'itaivan',
            'base_url' => 'https://itaivan.test',
            'root_domain' => 'itaivan.test',
            'lifecycle_state' => 'active',
        ]);

        MarketProperty::factory()->count(3)->create([
            'crawler_run_id' => CrawlerRun::factory()->create(['crawl_agency_id' => $itaivan->id])->id,
        ]);
        MarketProperty::factory()->create(['crawler_run_id' => CrawlerRun::factory()->create()->id]);

        $agencies = array_column($this->handle()['by_agency']['items'], 'count', 'label');

        $this->assertSame(3, $agencies['ITAIVAN Imobiliária']);
        $this->assertSame(0.75, $this->handle()['by_agency']['items'][0]['share']);
    }

    public function test_field_completeness_reports_the_share_of_filled_records(): void
    {
        $run = CrawlerRun::factory()->create();
        MarketProperty::factory()->create(['crawler_run_id' => $run->id, 'area' => 100, 'ano_construcao' => null]);
        MarketProperty::factory()->create(['crawler_run_id' => $run->id, 'area' => null, 'ano_construcao' => null]);

        $completeness = collect($this->handle()['field_completeness']['items'])->keyBy('field');

        $this->assertSame(1.0, $completeness['price']['share']);
        $this->assertSame(0.5, $completeness['area']['share']);
        $this->assertSame(0.0, $completeness['construction_year']['share']);
    }

    /**
     * @return array<string, mixed>
     */
    private function handle(): array
    {
        return app(MarketOverviewService::class)->handle(MarketAnalyticsFilters::fromArray([]));
    }
}
