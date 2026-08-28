<?php

namespace Tests\Feature\NewProperties;

use App\Services\NewProperties\NewPropertiesQueryService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class NewPropertiesQueryServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_classifies_new_listings_and_price_per_square_meter_opportunities(): void
    {
        $publishedAt = CarbonImmutable::parse('2026-08-27 12:00:00', 'UTC');
        $historyPublishedAt = $publishedAt->subDays(17);
        $agencyId = DB::table('crawler.crawl_agencies')->insertGetId([
            'name' => 'Imobiliária Exemplo',
            'slug' => 'imobiliaria-exemplo',
            'base_url' => 'https://example.test',
            'root_domain' => 'example.test',
            'created_at' => $historyPublishedAt,
            'updated_at' => $publishedAt,
        ]);
        $historyRunId = $this->createPublishedRun($agencyId, $historyPublishedAt);
        $currentRunId = $this->createPublishedRun($agencyId, $publishedAt);
        $knownProperty = $this->createObservedProperty(
            $agencyId,
            $historyRunId,
            'known-listing',
            500_000,
            null,
            $historyPublishedAt,
        );

        $candidateProperty = $this->createObservedProperty(
            $agencyId,
            $currentRunId,
            'new-opportunity',
            400_000,
            null,
            $publishedAt,
        );

        foreach (range(1, 5) as $number) {
            $this->createObservedProperty(
                $agencyId,
                $currentRunId,
                "new-comparable-{$number}",
                500_000,
                null,
                $publishedAt,
            );
        }

        $this->createObservedProperty(
            $agencyId,
            $currentRunId,
            'known-listing',
            500_000,
            $knownProperty['identity_id'],
            $publishedAt,
        );
        DB::table('crawler.crawl_agencies')
            ->where('id', $agencyId)
            ->update(['current_published_crawl_run_id' => $currentRunId]);

        $result = app(NewPropertiesQueryService::class)->get();

        $this->assertSame(7, $result['meta']['total']);
        $this->assertSame(6, $result['meta']['total_new']);
        $this->assertSame(1, $result['meta']['total_opportunities']);
        $this->assertCount(1, $result['groups']);

        $group = $result['groups'][0];
        $this->assertSame('sufficient', $group['history']['status']);
        $this->assertSame(1, $group['history']['snapshot_count']);
        $this->assertSame(['total' => 7, 'new' => 6, 'opportunities' => 1], $group['counts']);
        $this->assertCount(6, $group['properties']);

        $candidate = collect($group['properties'])
            ->first(fn (array $property): bool => $property['property']->id === $candidateProperty['property_id']);

        $this->assertNotNull($candidate);
        $this->assertTrue($candidate['is_new']);
        $this->assertSame('absent_in_30_day_window', $candidate['new_reason']);
        $this->assertTrue($candidate['is_opportunity']);
        $this->assertSame(80, $candidate['opportunity_score']);
        $this->assertSame(20.0, $candidate['price_advantage_percentage']);
        $this->assertSame(6, $candidate['comparable_count']);
        $this->assertSame('low', $candidate['sample_size_indicator']);
    }

    private function createPublishedRun(int $agencyId, CarbonImmutable $publishedAt): int
    {
        return DB::table('crawler.crawl_runs')->insertGetId([
            'crawl_agency_id' => $agencyId,
            'technical_state' => 'succeeded',
            'publication_state' => 'published',
            'publishable' => true,
            'started_at' => $publishedAt->subMinutes(10),
            'completed_at' => $publishedAt->subMinute(),
            'published_at' => $publishedAt,
            'created_at' => $publishedAt,
            'updated_at' => $publishedAt,
        ]);
    }

    /**
     * @return array{property_id: int, identity_id: int}
     */
    private function createObservedProperty(
        int $agencyId,
        int $runId,
        string $listingKey,
        int $price,
        ?int $identityId,
        CarbonImmutable $observedAt,
    ): array {
        $propertyId = DB::table('crawler.market_properties')->insertGetId([
            'crawler_run_id' => $runId,
            'tipo' => 'Apartamento',
            'valor' => $price,
            'bairro' => 'Centro',
            'cidade' => 'Joinville',
            'link_imovel' => "https://example.test/venda/{$listingKey}",
            'quartos' => 2,
            'area' => 100,
            'payload' => json_encode(['purpose' => 'venda'], JSON_THROW_ON_ERROR),
            'created_at' => $observedAt,
        ]);

        if ($identityId === null) {
            $identityId = DB::table('crawler.listing_identities')->insertGetId([
                'crawl_agency_id' => $agencyId,
                'listing_key' => $listingKey,
                'canonical_url' => "https://example.test/venda/{$listingKey}",
                'last_seen_crawl_run_id' => $runId,
                'last_observed_at' => $observedAt,
                'created_at' => $observedAt,
                'updated_at' => $observedAt,
            ]);
        }

        DB::table('crawler.listing_versions')->insert([
            'listing_identity_id' => $identityId,
            'crawl_run_id' => $runId,
            'market_property_id' => $propertyId,
            'classification' => 'new',
            'observed_payload' => '{}',
            'observed_at' => $observedAt,
            'created_at' => $observedAt,
        ]);

        return [
            'property_id' => $propertyId,
            'identity_id' => $identityId,
        ];
    }
}
