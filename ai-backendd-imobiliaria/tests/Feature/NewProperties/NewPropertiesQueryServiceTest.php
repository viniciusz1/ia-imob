<?php

namespace Tests\Feature\NewProperties;

use App\Models\Agency;
use App\Models\Crawler\ListingIdentity;
use App\Models\CrawlerRun;
use App\Models\MarketProperty;
use App\Models\User;
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

    public function test_api_filters_sorts_and_paginates_classified_listings_without_duplicates(): void
    {
        $this->seed(\Database\Seeders\PermissionSeeder::class);
        $user = User::factory()->for(Agency::factory())->create();
        $user->givePermissionTo('properties.view');
        $publishedAt = CarbonImmutable::parse('2026-09-23 12:00:00', 'UTC');
        $firstAgency = $this->createAgency('primeira-origem', $publishedAt);
        $secondAgency = $this->createAgency('segunda-origem', $publishedAt);
        $listingIds = [];

        foreach ([$firstAgency, $secondAgency] as $agencyId) {
            $agencyPublishedAt = $agencyId === $firstAgency ? $publishedAt : $publishedAt->subHours(2);
            $this->createPublishedRun($agencyId, $agencyPublishedAt->subDay());
            $runId = $this->createPublishedRun($agencyId, $agencyPublishedAt);
            $this->pointAgencyToCurrentRun($agencyId, $runId);

            foreach (range(1, $agencyId === $firstAgency ? 4 : 3) as $index) {
                $listing = $this->createObservedProperty(
                    $agencyId,
                    $runId,
                    "listing-{$agencyId}-{$index}",
                    $agencyId === $firstAgency && $index === 1 ? 400_000 : 500_000,
                    null,
                    $agencyPublishedAt,
                );
                $listingIds[] = $listing['property_id'];
            }
        }

        $this->actingAs($user);
        $first = $this->getJson('/api/v1/new-properties?per_page=2&page=1');
        $first->assertOk()
            ->assertJsonPath('meta.pagination.total', 7)
            ->assertJsonPath('meta.pagination.last_page', 4)
            ->assertJsonPath('meta.pagination.has_more', true)
            ->assertJsonPath('meta.total_opportunities', 1);
        $this->assertCount(2, collect($first->json('data'))->flatMap(fn ($group) => $group['properties']));

        $observed = [];
        foreach (range(1, 4) as $page) {
            $response = $this->getJson("/api/v1/new-properties?per_page=2&page={$page}")->assertOk();
            foreach ($response->json('data') as $group) {
                foreach ($group['properties'] as $property) {
                    $observed[] = $property['id'];
                }
            }
        }
        $this->assertEqualsCanonicalizing($listingIds, $observed);

        $this->getJson('/api/v1/new-properties?agency_id='.$firstAgency.'&flag=both&sort=opportunity_desc')
            ->assertOk()
            ->assertJsonPath('meta.pagination.total', 1)
            ->assertJsonPath('data.0.properties.0.is_new', true)
            ->assertJsonPath('data.0.properties.0.is_opportunity', true)
            ->assertJsonPath('data.0.properties.0.opportunity_score', 80);

        $this->getJson('/api/v1/new-properties?city=Joinville&neighborhood=Centro&type=Apartamento&purpose=venda&flag=opportunity')
            ->assertOk()
            ->assertJsonPath('meta.pagination.total', 1);

        $this->getJson('/api/v1/new-properties?sort=opportunity_desc&per_page=1')
            ->assertOk()
            ->assertJsonPath('data.0.properties.0.id', $listingIds[0]);

        $this->getJson('/api/v1/new-properties?sort=identified_asc&per_page=1')
            ->assertOk()
            ->assertJsonPath('data.0.properties.0.id', $listingIds[4]);

        $this->getJson('/api/v1/new-properties?search=SEGUNDA&bedrooms=2')
            ->assertOk()
            ->assertJsonPath('meta.pagination.total', 3);

        $this->getJson('/api/v1/new-properties?bedrooms=5%2B')
            ->assertOk()
            ->assertJsonPath('meta.pagination.total', 0)
            ->assertJsonCount(0, 'data');

        $this->getJson('/api/v1/new-properties?per_page=2&page=5')
            ->assertOk()
            ->assertJsonPath('meta.pagination.total', 7)
            ->assertJsonCount(0, 'data');

        $this->getJson('/api/v1/new-properties?sort=wrong&per_page=101')->assertUnprocessable();
    }

    public function test_api_rejects_unauthorized_users_and_handles_missing_listing_data(): void
    {
        $this->getJson('/api/v1/new-properties')->assertUnauthorized();
        $this->seed(\Database\Seeders\PermissionSeeder::class);
        $agency = Agency::factory()->create();
        $user = User::factory()->for($agency)->create();
        $this->actingAs($user)->getJson('/api/v1/new-properties')->assertForbidden();

        $platformAdmin = User::factory()->create(['agency_id' => null]);
        $platformAdmin->givePermissionTo('properties.view');
        $this->actingAs($platformAdmin)->getJson('/api/v1/new-properties')->assertForbidden();

        $user->givePermissionTo('properties.view');
        $publishedAt = CarbonImmutable::parse('2026-09-23 12:00:00', 'UTC');
        $crawlAgency = $this->createAgency('sem-dados', $publishedAt);
        $this->createPublishedRun($crawlAgency, $publishedAt->subDay());
        $runId = $this->createPublishedRun($crawlAgency, $publishedAt);
        $listing = $this->createObservedProperty($crawlAgency, $runId, 'sem-preco-area-foto', 0, null, $publishedAt);
        DB::table('crawler.market_properties')->where('id', $listing['property_id'])->update(['area' => null]);
        $this->pointAgencyToCurrentRun($crawlAgency, $runId);

        $this->actingAs($user)->getJson('/api/v1/new-properties')
            ->assertOk()
            ->assertJsonPath('data.0.properties.0.is_new', true)
            ->assertJsonPath('data.0.properties.0.is_opportunity', false)
            ->assertJsonPath('data.0.properties.0.opportunity_reason', 'missing_price_or_area')
            ->assertJsonPath('data.0.properties.0.image', '');

        $agency->update(['is_active' => false]);
        $this->actingAs($user->fresh())->getJson('/api/v1/new-properties')->assertForbidden();
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
