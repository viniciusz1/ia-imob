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
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Valida as regras, a API e o controle de acesso do módulo de Novos Imóveis.
 * Os cenários cobrem anúncios repetidos, falta de informações e filtros.
 */
class NewPropertiesQueryServiceTest extends TestCase
{
    use RefreshDatabase;

    /** Cenário completo: um anúncio já conhecido, um Novo e um que é Novo e Oportunidade. */
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

    /** Sem snapshot anterior, nenhum anúncio pode ser marcado como Novo. */
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

    /** Anúncio repetido: mudar preço, descrição, foto ou URL não o transforma em Novo. */
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
            'Descrição antiga',
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
            'Descrição e preço alterados',
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

    /** O histórico ignora snapshots fora da janela, não publicados e de outras imobiliárias. */
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

    /** Filtros, ordenação e paginação da API, sem anúncio repetido entre as páginas. */
    public function test_api_filters_sorts_and_paginates_classified_listings_without_duplicates(): void
    {
        $this->seed(PermissionSeeder::class);
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

    /** Acesso de usuários e resposta da API para anúncio sem preço, área ou foto. */
    public function test_api_rejects_unauthorized_users_and_handles_missing_listing_data(): void
    {
        $this->getJson('/api/v1/new-properties')->assertUnauthorized();
        $this->seed(PermissionSeeder::class);
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

    /** Falta de informações: cada anúncio sem Oportunidade precisa trazer o motivo correto. */
    public function test_opportunity_reasons_explain_each_incomplete_or_unfavorable_listing(): void
    {
        $publishedAt = CarbonImmutable::parse('2026-10-01 12:00:00', 'UTC');
        $agencyId = $this->createAgency('motivos-oportunidade', $publishedAt->subDay());
        $this->createPublishedRun($agencyId, $publishedAt->subDay());
        $runId = $this->createPublishedRun($agencyId, $publishedAt);
        $this->pointAgencyToCurrentRun($agencyId, $runId);
        $listing = fn (string $key, int $price, array $attributes = []): int => $this->createObservedProperty(
            $agencyId,
            $runId,
            $key,
            $price,
            null,
            $publishedAt,
            $attributes,
        )['property_id'];
        $createPeers = function (string $neighborhood) use ($listing): void {
            foreach (range(1, 5) as $number) {
                $listing("{$neighborhood}-referencia-{$number}", 500_000, ['bairro' => $neighborhood]);
            }
        };

        $fewComparables = $listing('poucos-candidato', 300_000, ['bairro' => 'Poucos']);
        foreach (range(1, 3) as $number) {
            $listing("poucos-{$number}", 500_000, ['bairro' => 'Poucos']);
        }

        $belowThreshold = $listing('limiar-candidato', 450_000, ['bairro' => 'Limiar']);
        $createPeers('Limiar');

        $exactThreshold = $listing('exato-candidato', 425_000, ['bairro' => 'Exato']);
        $atMedian = $listing('exato-na-mediana', 500_000, ['bairro' => 'Exato']);
        $createPeers('Exato');

        $withoutNeighborhood = $listing('sem-bairro', 400_000, ['bairro' => null]);
        $withoutPurpose = $listing('sem-finalidade', 400_000, [
            'link_imovel' => 'https://example.test/imovel/sem-finalidade',
            'payload' => '{}',
        ]);

        $result = app(NewPropertiesQueryService::class)->get();
        $properties = collect($result['groups'][0]['properties'])
            ->keyBy(fn (array $property): int => $property['property']->id);

        $this->assertSame('insufficient_comparables', $properties[$fewComparables]['opportunity_reason']);
        $this->assertSame(3, $properties[$fewComparables]['comparable_count']);
        $this->assertNull($properties[$fewComparables]['sample_size_indicator']);
        $this->assertSame('below_opportunity_threshold', $properties[$belowThreshold]['opportunity_reason']);
        $this->assertFalse($properties[$belowThreshold]['is_opportunity']);
        $this->assertNull($properties[$belowThreshold]['opportunity_score']);
        $this->assertSame(10.0, $properties[$belowThreshold]['price_advantage_percentage']);
        $this->assertTrue($properties[$exactThreshold]['is_opportunity']);
        $this->assertSame(60, $properties[$exactThreshold]['opportunity_score']);
        $this->assertSame('at_or_above_comparable_median', $properties[$atMedian]['opportunity_reason']);
        $this->assertSame('invalid_comparable_segment', $properties[$withoutNeighborhood]['opportunity_reason']);
        $this->assertSame('invalid_comparable_segment', $properties[$withoutPurpose]['opportunity_reason']);
        $this->assertNull($properties[$withoutPurpose]['purpose']);
    }

    /** Só entram na amostra os imóveis realmente parecidos com o candidato. */
    public function test_comparable_sample_respects_area_band_bedrooms_and_purpose(): void
    {
        $publishedAt = CarbonImmutable::parse('2026-10-01 12:00:00', 'UTC');
        $agencyId = $this->createAgency('amostra-comparavel', $publishedAt->subDay());
        $this->createPublishedRun($agencyId, $publishedAt->subDay());
        $runId = $this->createPublishedRun($agencyId, $publishedAt);
        $this->pointAgencyToCurrentRun($agencyId, $runId);
        $listing = fn (string $key, array $attributes = []): int => $this->createObservedProperty(
            $agencyId,
            $runId,
            $key,
            500_000,
            null,
            $publishedAt,
            $attributes,
        )['property_id'];

        $candidate = $listing('candidato');
        $listing('limite-superior-a', ['area' => 125]);
        $listing('limite-superior-b', ['area' => 125]);
        $listing('limite-inferior-a', ['area' => 75]);
        $listing('limite-inferior-b', ['area' => 75]);
        $listing('quartos-desconhecidos', ['quartos' => null]);
        $listing('area-acima', ['area' => 126]);
        $listing('area-abaixo', ['area' => 74]);
        $listing('outros-quartos', ['quartos' => 3]);
        $listing('locacao', [
            'link_imovel' => 'https://example.test/locacao/comparavel',
            'payload' => json_encode(['purpose' => 'locacao'], JSON_THROW_ON_ERROR),
        ]);

        $result = app(NewPropertiesQueryService::class)->get();
        $property = collect($result['groups'][0]['properties'])
            ->first(fn (array $item): bool => $item['property']->id === $candidate);

        $this->assertSame(5, $property['comparable_count']);
        $this->assertSame('low', $property['sample_size_indicator']);
    }

    /** Anúncio que some e volta não é Novo, e anúncio vendido sai do inventário. */
    public function test_absent_and_removed_listings_leave_the_inventory_without_becoming_new_on_return(): void
    {
        $publishedAt = CarbonImmutable::parse('2026-10-01 12:00:00', 'UTC');
        $agencyId = $this->createAgency('ausencia-e-retorno', $publishedAt->subDays(20));
        $inventory = app(ListingInventoryService::class);
        $publish = function (CarbonImmutable $at, array $externalIds) use ($agencyId, $inventory): void {
            $run = CrawlerRun::query()->findOrFail($this->createPublishedRun($agencyId, $at));

            foreach ($externalIds as $externalId => $payload) {
                $this->createInventoryProperty(
                    $run->id,
                    $externalId,
                    "https://example.test/venda/{$externalId}",
                    500_000,
                    'Mesmo anúncio',
                    'https://example.test/foto.jpg',
                    $payload,
                );
            }

            $inventory->applyPublishedSnapshot($run);
            $this->pointAgencyToCurrentRun($agencyId, $run->id);
        };

        $publish($publishedAt->subDays(20), ['some-e-volta' => [], 'permanece' => []]);
        $publish($publishedAt->subDays(10), ['permanece' => []]);

        $whileMissing = app(NewPropertiesQueryService::class)->get();
        $this->assertSame(['total' => 1, 'new' => 0, 'opportunities' => 0], $whileMissing['groups'][0]['counts']);

        $publish($publishedAt, [
            'some-e-volta' => [],
            'permanece' => [],
            'vendido' => ['availability' => 'sold'],
        ]);

        $afterReturn = app(NewPropertiesQueryService::class)->get();
        $returned = ListingIdentity::query()->where('listing_key', 'external:some-e-volta')->firstOrFail();

        $this->assertSame(
            ['new', 'missing', 'changed'],
            $returned->versions()->orderBy('id')->pluck('classification')->all(),
        );
        $this->assertSame(['total' => 2, 'new' => 0, 'opportunities' => 0], $afterReturn['groups'][0]['counts']);
    }

    /** Conhecido só antes da janela volta a ser Novo, e outra imobiliária não interfere. */
    public function test_new_flag_ignores_listings_outside_the_window_and_from_other_agencies(): void
    {
        $publishedAt = CarbonImmutable::parse('2026-10-01 12:00:00', 'UTC');
        $agencyId = $this->createAgency('agencia-observada', $publishedAt->subDays(31));
        $otherAgencyId = $this->createAgency('agencia-repetida', $publishedAt->subDays(5));

        $oldRunId = $this->createPublishedRun($agencyId, $publishedAt->subDays(31));
        $oldListing = $this->createObservedProperty($agencyId, $oldRunId, 'antigo', 500_000, null, $publishedAt->subDays(31));
        $windowRunId = $this->createPublishedRun($agencyId, $publishedAt->subDays(5));
        $this->createObservedProperty($agencyId, $windowRunId, 'dentro-da-janela', 500_000, null, $publishedAt->subDays(5));
        $otherRunId = $this->createPublishedRun($otherAgencyId, $publishedAt->subDays(5));
        $this->createObservedProperty($otherAgencyId, $otherRunId, 'repetido-entre-origens', 500_000, null, $publishedAt->subDays(5));

        $currentRunId = $this->createPublishedRun($agencyId, $publishedAt);
        $this->createObservedProperty($agencyId, $currentRunId, 'antigo', 500_000, $oldListing['identity_id'], $publishedAt);
        $this->createObservedProperty($agencyId, $currentRunId, 'repetido-entre-origens', 500_000, null, $publishedAt);
        $this->pointAgencyToCurrentRun($agencyId, $currentRunId);

        $result = app(NewPropertiesQueryService::class)->get();
        $group = $result['groups'][0];

        $this->assertSame(1, $group['history']['observed_identity_count']);
        $this->assertSame(['total' => 2, 'new' => 2, 'opportunities' => 0], $group['counts']);
        $this->assertSame(
            ['absent_in_30_day_window', 'absent_in_30_day_window'],
            collect($group['properties'])->pluck('new_reason')->all(),
        );
    }

    /** Filtros restantes e opções sem repetição, mesmo com grafias diferentes na fonte. */
    public function test_api_filters_by_every_characteristic_and_lists_each_option_once(): void
    {
        $this->seed(PermissionSeeder::class);
        $user = User::factory()->for(Agency::factory())->create();
        $user->givePermissionTo('properties.view');
        $publishedAt = CarbonImmutable::parse('2026-10-01 12:00:00', 'UTC');
        $agencyId = $this->createAgency('filtros-restantes', $publishedAt->subDay());
        $this->createPublishedRun($agencyId, $publishedAt->subDay());
        $runId = $this->createPublishedRun($agencyId, $publishedAt);
        $this->pointAgencyToCurrentRun($agencyId, $runId);
        $listing = fn (string $key, array $attributes): int => $this->createObservedProperty(
            $agencyId,
            $runId,
            $key,
            500_000,
            null,
            $publishedAt,
            $attributes,
        )['property_id'];

        $accented = $listing('acentuado', [
            'tipo' => 'Sala',
            'cidade' => 'Jaraguá do Sul',
            'bairro' => 'Centro',
            'banheiros' => 5,
            'vagas' => 1,
        ]);
        $uppercase = $listing('maiusculo', [
            'tipo' => 'sala',
            'cidade' => 'JARAGUA DO SUL',
            'bairro' => 'CENTRO',
            'banheiros' => 2,
            'vagas' => 6,
        ]);
        $rental = $listing('locacao', [
            'tipo' => 'Sala',
            'cidade' => 'Joinville',
            'bairro' => 'América',
            'banheiros' => 1,
            'vagas' => 2,
            'link_imovel' => 'https://example.test/locacao/filtros',
            'payload' => json_encode(['purpose' => 'locacao'], JSON_THROW_ON_ERROR),
        ]);

        $this->actingAs($user);
        $idsFor = fn (string $query): array => collect($this->getJson("/api/v1/new-properties?{$query}")->assertOk()->json('data'))
            ->flatMap(fn (array $group): array => $group['properties'])
            ->pluck('id')
            ->all();

        $this->assertSame([$accented], $idsFor('bathrooms=5%2B'));
        $this->assertSame([$uppercase], $idsFor('bathrooms=2'));
        $this->assertSame([$uppercase], $idsFor('parking=5%2B'));
        $this->assertSame([$rental], $idsFor('parking=2'));
        $this->assertSame([$rental], $idsFor('purpose=locacao'));
        $this->assertSame([$accented, $uppercase], $idsFor('city=jaragua%20do%20sul'));
        $this->assertSame([$accented, $uppercase], $idsFor('neighborhood=centro'));
        $this->assertSame([$rental], $idsFor('neighborhood=AMERICA'));

        $filters = $this->getJson('/api/v1/new-properties')->assertOk()->json('meta.filters');
        $this->assertSame(['Jaraguá do Sul', 'Joinville'], $filters['cities']);
        $this->assertSame(['América', 'Centro'], $filters['neighborhoods']);
        $this->assertSame(['Sala'], $filters['types']);
        $this->assertSame(['locacao', 'venda'], $filters['purposes']);
    }

    /** Cria um snapshot já publicado para a imobiliária. */
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

    /** Define qual snapshot é o publicado vigente da imobiliária. */
    private function pointAgencyToCurrentRun(int $agencyId, int $runId): void
    {
        DB::table('crawler.crawl_agencies')
            ->where('id', $agencyId)
            ->update(['current_published_crawl_run_id' => $runId]);
    }

    /** Cria um anúncio para ser processado pelo serviço real de inventário do crawler. */
    private function createInventoryProperty(
        int $runId,
        string $externalId,
        string $url,
        int $price,
        string $description,
        string $image,
        array $payload = [],
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
                ...$payload,
            ],
            'normalization_warnings' => [],
            'extraction_trace' => [],
        ]);
    }

    /**
     * Cria um anúncio observado no snapshot, reaproveitando a identidade quando informada.
     * Os atributos extras substituem os valores padrão do imóvel.
     *
     * @return array{property_id: int, identity_id: int}
     */
    private function createObservedProperty(
        int $agencyId,
        int $runId,
        string $listingKey,
        int $price,
        ?int $identityId,
        CarbonImmutable $observedAt,
        array $attributes = [],
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
            ...$attributes,
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
