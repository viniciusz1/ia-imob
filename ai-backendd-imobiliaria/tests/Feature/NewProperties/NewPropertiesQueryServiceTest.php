<?php

namespace Tests\Feature\NewProperties;

use App\Models\Crawler\ListingIdentity;
use App\Models\CrawlerRun;
use App\Models\MarketProperty;
use App\Services\Crawler\ListingInventoryService;
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
        $this->assertSame(30, $group['history']['window_days']);
        $this->assertSame($publishedAt->subDays(30)->toISOString(), $group['history']['window_start']);
        $this->assertSame($publishedAt->toISOString(), $group['history']['window_end']);
        $this->assertSame(1, $group['history']['snapshot_count']);
        $this->assertSame([$historyRunId], $group['history']['snapshot_ids']);
        $this->assertSame(1, $group['history']['observed_identity_count']);
        $this->assertSame('listing_identity', $group['history']['identity_strategy']);
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

    public function test_it_reports_insufficient_history_without_marking_every_current_listing_as_new(): void
    {
        $publishedAt = CarbonImmutable::parse('2026-09-01 12:00:00', 'UTC');
        $agencyId = $this->createAgency('sem-historico', $publishedAt);
        $currentRunId = $this->createPublishedRun($agencyId, $publishedAt);
        $this->createObservedProperty(
            $agencyId,
            $currentRunId,
            'primeiro-anuncio',
            350_000,
            null,
            $publishedAt,
        );
        $this->pointAgencyToCurrentRun($agencyId, $currentRunId);

        $result = app(NewPropertiesQueryService::class)->get();

        $this->assertSame(0, $result['meta']['total_new']);
        $this->assertCount(1, $result['groups']);
        $this->assertSame(['total' => 1, 'new' => 0, 'opportunities' => 0], $result['groups'][0]['counts']);
        $this->assertSame([], $result['groups'][0]['properties']);
        $this->assertSame([
            'status' => 'insufficient',
            'window_days' => 30,
            'window_start' => $publishedAt->subDays(30)->toISOString(),
            'window_end' => $publishedAt->toISOString(),
            'snapshot_count' => 0,
            'snapshot_ids' => [],
            'observed_identity_count' => 0,
            'identity_strategy' => 'listing_identity',
        ], $result['groups'][0]['history']);
    }

    public function test_changed_content_and_url_keep_the_same_external_listing_identity_and_are_not_new(): void
    {
        $publishedAt = CarbonImmutable::parse('2026-09-01 12:00:00', 'UTC');
        $historyPublishedAt = $publishedAt->subDays(10);
        $agencyId = $this->createAgency('identidade-estavel', $historyPublishedAt);
        $historyRun = CrawlerRun::query()->findOrFail(
            $this->createPublishedRun($agencyId, $historyPublishedAt),
        );
        $this->createInventoryProperty(
            $historyRun->id,
            'codigo-123',
            'https://example.test/imovel/endereco-antigo',
            500_000,
            'DescriÃ§Ã£o antiga',
            'https://example.test/foto-antiga.jpg',
        );
        app(ListingInventoryService::class)->applyPublishedSnapshot($historyRun);

        $currentRun = CrawlerRun::query()->findOrFail(
            $this->createPublishedRun($agencyId, $publishedAt),
        );
        $this->createInventoryProperty(
            $currentRun->id,
            'codigo-123',
            'https://example.test/imovel/endereco-novo',
            450_000,
            'DescriÃ§Ã£o e preÃ§o alterados',
            'https://example.test/foto-nova.jpg',
        );
        app(ListingInventoryService::class)->applyPublishedSnapshot($currentRun);
        $this->pointAgencyToCurrentRun($agencyId, $currentRun->id);

        $result = app(NewPropertiesQueryService::class)->get();
        $identity = ListingIdentity::query()->firstOrFail();

        $this->assertDatabaseCount('crawler.listing_identities', 1);
        $this->assertSame('external:codigo-123', $identity->listing_key);
        $this->assertSame(
            ['new', 'changed'],
            $identity->versions()->orderBy('id')->pluck('classification')->all(),
        );
        $this->assertSame(0, $result['meta']['total_new']);
        $this->assertSame(1, $result['groups'][0]['history']['observed_identity_count']);
        $this->assertSame(['total' => 1, 'new' => 0, 'opportunities' => 0], $result['groups'][0]['counts']);
    }

    public function test_history_uses_only_published_snapshots_from_the_same_agency_in_the_inclusive_30_day_window(): void
    {
        $publishedAt = CarbonImmutable::parse('2026-09-01 12:00:00', 'UTC');
        $agencyId = $this->createAgency('agencia-principal', $publishedAt->subDays(31));
        $otherAgencyId = $this->createAgency('outra-agencia', $publishedAt->subDays(5));

        $outsideRunId = $this->createPublishedRun($agencyId, $publishedAt->subDays(30)->subSecond());
        $this->createObservedProperty($agencyId, $outsideRunId, 'fora-da-janela', 500_000, null, $publishedAt->subDays(30)->subSecond());

        $boundaryRunId = $this->createPublishedRun($agencyId, $publishedAt->subDays(30));
        $boundaryProperty = $this->createObservedProperty(
            $agencyId,
            $boundaryRunId,
            'identidade-no-limite',
            500_000,
            null,
            $publishedAt->subDays(30),
        );

        $candidateRunId = $this->createRun($agencyId, $publishedAt->subDays(5), 'candidate');
        $this->createObservedProperty($agencyId, $candidateRunId, 'nao-publicado', 500_000, null, $publishedAt->subDays(5));

        $otherAgencyRunId = $this->createPublishedRun($otherAgencyId, $publishedAt->subDay());
        $this->createObservedProperty($otherAgencyId, $otherAgencyRunId, 'outra-origem', 500_000, null, $publishedAt->subDay());

        $currentRunId = $this->createPublishedRun($agencyId, $publishedAt);
        $this->createObservedProperty(
            $agencyId,
            $currentRunId,
            'identidade-no-limite-com-url-nova',
            510_000,
            $boundaryProperty['identity_id'],
            $publishedAt,
        );
        $this->pointAgencyToCurrentRun($agencyId, $currentRunId);

        $result = app(NewPropertiesQueryService::class)->get();
        $history = $result['groups'][0]['history'];

        $this->assertSame('sufficient', $history['status']);
        $this->assertSame($publishedAt->subDays(30)->toISOString(), $history['window_start']);
        $this->assertSame($publishedAt->toISOString(), $history['window_end']);
        $this->assertSame(1, $history['snapshot_count']);
        $this->assertSame([$boundaryRunId], $history['snapshot_ids']);
        $this->assertSame(1, $history['observed_identity_count']);
        $this->assertSame(0, $result['meta']['total_new']);
    }

    private function createPublishedRun(int $agencyId, CarbonImmutable $publishedAt): int
    {
        return $this->createRun($agencyId, $publishedAt, 'published');
    }

    private function createRun(int $agencyId, CarbonImmutable $publishedAt, string $publicationState): int
    {
        return DB::table('crawler.crawl_runs')->insertGetId([
            'crawl_agency_id' => $agencyId,
            'technical_state' => 'succeeded',
            'publication_state' => $publicationState,
            'publishable' => true,
            'started_at' => $publishedAt->subMinutes(10),
            'completed_at' => $publishedAt->subMinute(),
            'published_at' => $publishedAt,
            'created_at' => $publishedAt,
            'updated_at' => $publishedAt,
        ]);
    }

    private function createAgency(string $slug, CarbonImmutable $createdAt): int
    {
        return DB::table('crawler.crawl_agencies')->insertGetId([
            'name' => str($slug)->replace('-', ' ')->title()->toString(),
            'slug' => $slug,
            'base_url' => "https://{$slug}.example.test",
            'root_domain' => "{$slug}.example.test",
            'created_at' => $createdAt,
            'updated_at' => $createdAt,
        ]);
    }

    private function pointAgencyToCurrentRun(int $agencyId, int $runId): void
    {
        DB::table('crawler.crawl_agencies')
            ->where('id', $agencyId)
            ->update(['current_published_crawl_run_id' => $runId]);
    }

    private function createInventoryProperty(
        int $runId,
        string $externalId,
        string $url,
        int $price,
        string $description,
        string $image,
    ): MarketProperty {
        return MarketProperty::query()->create([
            'crawler_run_id' => $runId,
            'tipo' => 'Apartamento',
            'valor' => $price,
            'bairro' => 'Centro',
            'cidade' => 'Joinville',
            'link_imovel' => $url,
            'imagem' => $image,
            'descricao' => $description,
            'quartos' => 2,
            'area' => 100,
            'payload' => [
                'external_id' => $externalId,
                'link_imovel' => $url,
                'valor' => $price,
                'descricao' => $description,
                'imagem' => $image,
                'purpose' => 'venda',
            ],
            'normalization_warnings' => [],
            'extraction_trace' => [],
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
