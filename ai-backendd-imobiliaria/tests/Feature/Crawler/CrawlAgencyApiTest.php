<?php

namespace Tests\Feature\Crawler;

use App\Models\Crawler\CrawlAgency;
use App\Models\Crawler\CrawlerOperation;
use App\Models\Crawler\DiscoverySnapshot;
use App\Models\Crawler\ExtractionProfile;
use App\Models\Crawler\ListingIdentity;
use App\Models\Crawler\MarketDataContractVersion;
use App\Models\Crawler\Prospect;
use App\Models\CrawlerRun;
use App\Models\MarketProperty;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CrawlAgencyApiTest extends TestCase
{
    use RefreshDatabase;

    private User $platformAdmin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
        $this->platformAdmin = User::query()
            ->where('email', 'platform@imobiliaria.com')
            ->firstOrFail();
    }

    public function test_operator_can_register_and_read_a_crawl_agency(): void
    {
        $created = $this->actingAs($this->platformAdmin)
            ->postJson('/api/v1/admin/crawler/crawl-agencies', [
                'name' => 'Imóveis Litoral',
                'slug' => 'imoveis-litoral',
                'base_url' => 'https://www.imoveislitoral.com.br/imoveis',
                'root_domain' => 'imoveislitoral.com.br',
            ])
            ->assertCreated()
            ->assertJsonPath('data.lifecycle_state', 'onboarding')
            ->assertJsonPath('data.health_state', 'unknown')
            ->json('data');

        $this->actingAs($this->platformAdmin)
            ->getJson('/api/v1/admin/crawler/crawl-agencies/'.$created['id'])
            ->assertOk()
            ->assertJsonPath('data.id', $created['id'])
            ->assertJsonPath('data.root_domain', 'imoveislitoral.com.br');
    }

    public function test_root_domain_is_globally_unique(): void
    {
        $payload = [
            'name' => 'Primeira Agência',
            'slug' => 'primeira-agencia',
            'base_url' => 'https://example.com/imoveis',
            'root_domain' => 'example.com',
        ];

        $this->actingAs($this->platformAdmin)
            ->postJson('/api/v1/admin/crawler/crawl-agencies', $payload)
            ->assertCreated();

        $this->actingAs($this->platformAdmin)
            ->postJson('/api/v1/admin/crawler/crawl-agencies', [
                ...$payload,
                'name' => 'Agência Duplicada',
                'slug' => 'agencia-duplicada',
                'root_domain' => 'EXAMPLE.COM',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('root_domain');
    }

    public function test_lifecycle_rejects_invalid_transitions_and_keeps_health_separate(): void
    {
        $agency = $this->actingAs($this->platformAdmin)
            ->postJson('/api/v1/admin/crawler/crawl-agencies', [
                'name' => 'Agência em Onboarding',
                'slug' => 'agencia-onboarding',
                'base_url' => 'https://onboarding.example.com',
                'root_domain' => 'onboarding.example.com',
            ])
            ->assertCreated()
            ->json('data');

        $this->actingAs($this->platformAdmin)
            ->patchJson('/api/v1/admin/crawler/crawl-agencies/'.$agency['id'].'/lifecycle', [
                'lifecycle_state' => 'paused',
            ])
            ->assertUnprocessable();

        $this->actingAs($this->platformAdmin)
            ->patchJson('/api/v1/admin/crawler/crawl-agencies/'.$agency['id'].'/lifecycle', [
                'lifecycle_state' => 'active',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('lifecycle_state');

        $this->assertSame('unknown', CrawlAgency::query()->findOrFail($agency['id'])->health_state);
    }

    public function test_editing_name_and_domain_preserves_internal_identity(): void
    {
        $agency = $this->actingAs($this->platformAdmin)
            ->postJson('/api/v1/admin/crawler/crawl-agencies', [
                'name' => 'Nome Original',
                'slug' => 'nome-original',
                'base_url' => 'https://old.example.com',
                'root_domain' => 'old.example.com',
            ])
            ->assertCreated()
            ->json('data');

        $this->actingAs($this->platformAdmin)
            ->putJson('/api/v1/admin/crawler/crawl-agencies/'.$agency['id'], [
                'name' => 'Nome Atualizado',
                'slug' => 'nome-atualizado',
                'base_url' => 'https://new.example.com/listings',
                'root_domain' => 'new.example.com',
            ])
            ->assertOk()
            ->assertJsonPath('data.id', $agency['id'])
            ->assertJsonPath('data.root_domain', 'new.example.com');
    }

    public function test_list_filters_by_name_domain_lifecycle_and_health(): void
    {
        foreach ([
            ['Alpha Sul', 'alpha-sul', 'alpha.example.com'],
            ['Beta Norte', 'beta-norte', 'beta.example.com'],
        ] as [$name, $slug, $domain]) {
            $this->actingAs($this->platformAdmin)
                ->postJson('/api/v1/admin/crawler/crawl-agencies', [
                    'name' => $name,
                    'slug' => $slug,
                    'base_url' => 'https://'.$domain,
                    'root_domain' => $domain,
                ])
                ->assertCreated();
        }

        $this->actingAs($this->platformAdmin)
            ->getJson('/api/v1/admin/crawler/crawl-agencies?search=beta.example&lifecycle_state=onboarding&health_state=unknown')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Beta Norte');
    }

    public function test_list_returns_city_and_state_from_agency_or_linked_prospect_and_searches_by_city(): void
    {
        $directAgency = $this->actingAs($this->platformAdmin)
            ->postJson('/api/v1/admin/crawler/crawl-agencies', [
                'name' => 'Imobiliária Joinville',
                'slug' => 'imobiliaria-joinville',
                'base_url' => 'https://joinville.example.com',
                'root_domain' => 'joinville.example.com',
                'city' => 'Joinville',
                'state' => 'sc',
            ])
            ->assertCreated()
            ->assertJsonPath('data.city', 'Joinville')
            ->assertJsonPath('data.state', 'SC')
            ->json('data');

        $prospectAgency = CrawlAgency::query()->create([
            'name' => 'D2 Imóveis',
            'slug' => 'd2-imoveis',
            'base_url' => 'https://d2imoveis.example.com',
            'root_domain' => 'd2imoveis.example.com',
            'lifecycle_state' => 'onboarding',
        ]);

        Prospect::query()->create([
            'root_domain' => 'd2imoveis.example.com',
            'google_place_id' => 'place-d2',
            'name' => 'D2 Imóveis',
            'city' => 'Jaraguá do Sul',
            'state' => 'SC',
            'base_url' => 'https://d2imoveis.example.com',
            'source' => 'google_places',
            'automatic_classification' => 'candidate',
            'review_state' => 'approved',
            'promoted_crawl_agency_id' => $prospectAgency->id,
            'metadata' => [],
        ]);

        $this->actingAs($this->platformAdmin)
            ->getJson('/api/v1/admin/crawler/crawl-agencies?search=Jaraguá')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $prospectAgency->id)
            ->assertJsonPath('data.0.city', 'Jaraguá do Sul')
            ->assertJsonPath('data.0.state', 'SC');

        $this->actingAs($this->platformAdmin)
            ->getJson('/api/v1/admin/crawler/crawl-agencies?search=Joinville')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $directAgency['id'])
            ->assertJsonPath('data.0.city', 'Joinville')
            ->assertJsonPath('data.0.state', 'SC');
    }

    public function test_operator_can_request_a_larger_agency_page_for_global_controls(): void
    {
        foreach (range(1, 20) as $index) {
            CrawlAgency::query()->create([
                'name' => "Agency {$index}",
                'slug' => "agency-{$index}",
                'base_url' => "https://agency-{$index}.example.com",
                'root_domain' => "agency-{$index}.example.com",
            ]);
        }

        $this->actingAs($this->platformAdmin)
            ->getJson('/api/v1/admin/crawler/crawl-agencies?per_page=100')
            ->assertOk()
            ->assertJsonCount(20, 'data')
            ->assertJsonPath('meta.per_page', 100);
    }

    public function test_list_can_be_sorted_by_most_recently_modified(): void
    {
        foreach (['Alpha', 'Beta', 'Gamma'] as $index => $name) {
            $agency = CrawlAgency::query()->create([
                'name' => $name,
                'slug' => strtolower($name),
                'base_url' => 'https://'.strtolower($name).'.example.com',
                'root_domain' => strtolower($name).'.example.com',
            ]);
            $agency->forceFill(['updated_at' => now()->subDays(3 - $index)])->saveQuietly();
        }

        CrawlAgency::query()->where('name', 'Alpha')->update(['updated_at' => now()->addMinute()]);

        $this->actingAs($this->platformAdmin)
            ->getJson('/api/v1/admin/crawler/crawl-agencies?sort=-updated_at')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Alpha')
            ->assertJsonPath('data.1.name', 'Gamma')
            ->assertJsonPath('data.2.name', 'Beta');

        $this->actingAs($this->platformAdmin)
            ->getJson('/api/v1/admin/crawler/crawl-agencies')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Alpha')
            ->assertJsonPath('data.1.name', 'Beta')
            ->assertJsonPath('data.2.name', 'Gamma');
    }

    public function test_list_returns_last_crawled_at_and_filters_active_agencies(): void
    {
        $activeAgency = CrawlAgency::query()->create([
            'name' => 'Active Agency',
            'slug' => 'active-agency',
            'base_url' => 'https://active.example.com',
            'root_domain' => 'active.example.com',
            'lifecycle_state' => 'active',
        ]);

        $onboardingAgency = CrawlAgency::query()->create([
            'name' => 'Onboarding Agency',
            'slug' => 'onboarding-agency',
            'base_url' => 'https://onboarding.example.com',
            'root_domain' => 'onboarding.example.com',
            'lifecycle_state' => 'onboarding',
        ]);

        $crawlTime = now()->subHours(2)->startOfSecond();
        CrawlerRun::factory()->create([
            'crawl_agency_id' => $activeAgency->id,
            'started_at' => $crawlTime,
            'completed_at' => $crawlTime->copy()->addMinutes(5),
        ]);

        // Filter active only
        $response = $this->actingAs($this->platformAdmin)
            ->getJson('/api/v1/admin/crawler/crawl-agencies?lifecycle_state=active')
            ->assertOk();

        $activeData = collect($response->json('data'))->firstWhere('id', $activeAgency->id);
        $this->assertNotNull($activeData);
        $this->assertNotNull($activeData['last_crawled_at']);
        $this->assertNull(collect($response->json('data'))->firstWhere('id', $onboardingAgency->id));

        // Onboarding agency has null last_crawled_at
        $onboardingResponse = $this->actingAs($this->platformAdmin)
            ->getJson('/api/v1/admin/crawler/crawl-agencies?lifecycle_state=onboarding')
            ->assertOk();

        $onboardingData = collect($onboardingResponse->json('data'))->firstWhere('id', $onboardingAgency->id);
        $this->assertNotNull($onboardingData);
        $this->assertNull($onboardingData['last_crawled_at']);
    }

    public function test_operator_can_archive_an_agency_from_onboarding(): void
    {
        $agency = CrawlAgency::query()->create([
            'name' => 'Agency To Archive',
            'slug' => 'agency-to-archive',
            'base_url' => 'https://to-archive.example.com',
            'root_domain' => 'to-archive.example.com',
            'lifecycle_state' => 'onboarding',
        ]);

        $this->actingAs($this->platformAdmin)
            ->patchJson('/api/v1/admin/crawler/crawl-agencies/'.$agency->id.'/lifecycle', [
                'lifecycle_state' => 'archived',
            ])
            ->assertOk()
            ->assertJsonPath('data.lifecycle_state', 'archived');

        $this->assertSame('archived', $agency->fresh()->lifecycle_state);
    }

    public function test_archiving_an_active_agency_stops_displaying_its_properties_in_latest_run_and_filters(): void
    {
        $agency = CrawlAgency::query()->create([
            'name' => 'Active Scraped Agency',
            'slug' => 'active-scraped-agency',
            'base_url' => 'https://scraped.example.com',
            'root_domain' => 'scraped.example.com',
            'lifecycle_state' => 'active',
        ]);

        $run = CrawlerRun::factory()->create([
            'crawl_agency_id' => $agency->id,
            'publication_state' => 'published',
            'technical_state' => 'succeeded',
        ]);

        $property = MarketProperty::factory()->create([
            'crawler_run_id' => $run->id,
            'tipo' => 'Apartamento',
            'bairro' => 'Centro',
            'cidade' => 'Itajaí',
            'valor' => 500000,
        ]);

        ListingIdentity::query()->create([
            'crawl_agency_id' => $agency->id,
            'listing_key' => 'url:test-property-1',
            'canonical_url' => 'https://scraped.example.com/imovel-1',
            'inventory_state' => 'active',
            'current_market_property_id' => $property->id,
        ]);

        // When agency is active, property is in latestRun
        $this->assertTrue(MarketProperty::query()->latestRun()->where('crawler.market_properties.id', $property->id)->exists());

        // Archive the agency
        $this->actingAs($this->platformAdmin)
            ->patchJson('/api/v1/admin/crawler/crawl-agencies/'.$agency->id.'/lifecycle', [
                'lifecycle_state' => 'archived',
            ])
            ->assertOk()
            ->assertJsonPath('data.lifecycle_state', 'archived');

        // Once archived, property is stopped from being displayed in latestRun
        $this->assertFalse(MarketProperty::query()->latestRun()->where('crawler.market_properties.id', $property->id)->exists());

        // Filters endpoint does not list the archived agency
        $filtersResponse = $this->actingAs($this->platformAdmin)
            ->getJson('/api/v1/market-properties/filters')
            ->assertOk();

        $this->assertNotContains('Active Scraped Agency', $filtersResponse->json('imobiliarias'));
    }

    public function test_reactivating_an_archived_agency_requires_active_profile(): void
    {
        $agency = CrawlAgency::query()->create([
            'name' => 'Archived Agency',
            'slug' => 'archived-agency',
            'base_url' => 'https://archived.example.com',
            'root_domain' => 'archived.example.com',
            'lifecycle_state' => 'archived',
        ]);

        // Attempting to activate without active extraction profile fails
        $this->actingAs($this->platformAdmin)
            ->patchJson('/api/v1/admin/crawler/crawl-agencies/'.$agency->id.'/lifecycle', [
                'lifecycle_state' => 'active',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('lifecycle_state');

        // Create an active profile
        $contract = MarketDataContractVersion::query()->where('status', 'active')->firstOrFail();
        $operation = CrawlerOperation::query()->create([
            'type' => 'discovery',
            'state' => 'succeeded',
            'requested_by' => $this->platformAdmin->id,
            'crawl_agency_id' => $agency->id,
            'market_data_contract_version_id' => $contract->id,
            'plan' => [],
        ]);
        $snapshot = DiscoverySnapshot::query()->create([
            'operation_id' => $operation->id,
            'crawl_agency_id' => $agency->id,
            'url_count' => 1,
            'content_hash' => hash('sha256', 'test-snapshot'),
        ]);

        ExtractionProfile::query()->create([
            'crawl_agency_id' => $agency->id,
            'discovery_snapshot_id' => $snapshot->id,
            'market_data_contract_version_id' => $contract->id,
            'created_by_operation_id' => $operation->id,
            'version' => 1,
            'status' => 'active',
            'sample_url' => 'https://archived.example.com/imovel-1',
            'schemas' => [],
            'strategies' => ['xpath'],
            'fields' => [],
            'parameters' => [],
        ]);

        // Now reactivation succeeds
        $this->actingAs($this->platformAdmin)
            ->patchJson('/api/v1/admin/crawler/crawl-agencies/'.$agency->id.'/lifecycle', [
                'lifecycle_state' => 'active',
            ])
            ->assertOk()
            ->assertJsonPath('data.lifecycle_state', 'active');

        $this->assertSame('active', $agency->fresh()->lifecycle_state);
    }
}
