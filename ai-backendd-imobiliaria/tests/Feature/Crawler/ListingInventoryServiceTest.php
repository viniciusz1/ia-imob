<?php

namespace Tests\Feature\Crawler;

use App\Models\Crawler\CrawlAgency;
use App\Models\Crawler\CrawlerOperation;
use App\Models\Crawler\DiscoverySnapshot;
use App\Models\Crawler\ListingIdentity;
use App\Models\Crawler\MarketDataContractVersion;
use App\Models\Crawler\QualityPolicyVersion;
use App\Models\CrawlerRun;
use App\Models\MarketProperty;
use App\Models\User;
use App\Services\Crawler\CrawlRunPublicationService;
use App\Services\Crawler\ListingKeyResolver;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ListingInventoryServiceTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private CrawlAgency $agency;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
        $this->admin = User::query()->where('email', 'platform@imobiliaria.com')->firstOrFail();
        $this->agency = CrawlAgency::query()->create([
            'name' => 'Inventory Source',
            'slug' => 'inventory-source',
            'base_url' => 'https://inventory.example.com',
            'root_domain' => 'inventory.example.com',
            'lifecycle_state' => 'active',
        ]);
    }

    public function test_listing_key_prefers_external_id_and_canonicalizes_url_fallback(): void
    {
        $resolver = app(ListingKeyResolver::class);

        $this->assertSame('external:ABC-42', $resolver->resolve(['external_id' => 'ABC-42'], 'https://example.com/a'));
        $this->assertSame(
            $resolver->resolve([], 'HTTPS://Example.com/imovel/42/?utm_source=ads&b=2&a=1#photos'),
            $resolver->resolve([], 'https://example.com/imovel/42?a=1&b=2'),
        );
    }

    public function test_external_id_reuses_identity_when_url_changes_and_versions_are_immutable(): void
    {
        $first = $this->publish([
            ['external_id' => 'same-id', 'link_imovel' => 'https://inventory.example.com/old', 'valor' => 100000],
        ]);
        $identity = ListingIdentity::query()->firstOrFail();

        $second = $this->publish([
            ['external_id' => 'same-id', 'link_imovel' => 'https://inventory.example.com/new', 'valor' => 120000],
        ]);
        $this->publish([
            ['external_id' => 'same-id', 'link_imovel' => 'https://inventory.example.com/new', 'valor' => 120000],
        ]);

        $this->assertDatabaseCount('crawler.listing_identities', 1);
        $this->assertSame('active', $identity->refresh()->inventory_state);
        $this->assertSame(0, $identity->consecutive_absences);
        $this->assertSame(['new', 'changed', 'unchanged'], $identity->versions()->orderBy('id')->pluck('classification')->all());
        $this->assertSame($second->id, $identity->versions()->where('classification', 'changed')->value('crawl_run_id'));
        $this->assertNotSame($first->id, $second->id);

        $this->expectException(\LogicException::class);
        $identity->versions()->firstOrFail()->update(['classification' => 'changed']);
    }

    public function test_first_absence_remains_consumable_second_absence_removes_and_reappearance_reuses_identity(): void
    {
        $first = $this->publish([
            ['external_id' => 'target', 'link_imovel' => 'https://inventory.example.com/target', 'valor' => 100000],
            ['external_id' => 'control', 'link_imovel' => 'https://inventory.example.com/control', 'valor' => 200000],
        ]);
        $targetPropertyId = $first->marketProperties()->where('link_imovel', 'like', '%/target')->value('id');
        $identity = ListingIdentity::query()->where('listing_key', 'external:target')->firstOrFail();

        $missingSnapshot = $this->publish([
            ['external_id' => 'control', 'link_imovel' => 'https://inventory.example.com/control', 'valor' => 200000],
        ]);
        $this->assertSame('missing', $identity->refresh()->inventory_state);
        $this->assertSame(1, $identity->consecutive_absences);
        $this->assertContains($targetPropertyId, MarketProperty::query()->latestRun()->pluck('id')->all());
        $this->actingAs($this->admin)
            ->getJson("/api/v1/admin/crawler/crawl-runs/{$missingSnapshot->id}/records?view=normalized&listing_state=missing")
            ->assertOk()
            ->assertJsonPath('data.0.listing_state', 'missing')
            ->assertJsonPath('data.0.absence_count', 1)
            ->assertJsonPath('data.0.listing_reason', 'not_observed');

        $this->publish([
            ['external_id' => 'control', 'link_imovel' => 'https://inventory.example.com/control', 'valor' => 200000],
        ]);
        $this->assertSame('removed', $identity->refresh()->inventory_state);
        $this->assertSame(2, $identity->consecutive_absences);
        $this->assertNotContains($targetPropertyId, MarketProperty::query()->latestRun()->pluck('id')->all());

        $this->publish([
            ['external_id' => 'target', 'link_imovel' => 'https://inventory.example.com/target-new', 'valor' => 110000],
            ['external_id' => 'control', 'link_imovel' => 'https://inventory.example.com/control', 'valor' => 200000],
        ]);
        $this->assertSame('active', $identity->refresh()->inventory_state);
        $this->assertSame(0, $identity->consecutive_absences);
        $this->assertSame('reappeared', $identity->versions()->latest('id')->value('classification'));
    }

    public function test_explicit_unavailability_or_http_gone_removes_immediately(): void
    {
        $this->publish([
            ['external_id' => 'gone', 'link_imovel' => 'https://inventory.example.com/gone', 'http_status' => 410],
            ['external_id' => 'control', 'link_imovel' => 'https://inventory.example.com/control'],
        ]);

        $gone = ListingIdentity::query()->where('listing_key', 'external:gone')->firstOrFail();
        $this->assertSame('removed', $gone->inventory_state);
        $this->assertSame('http_410', $gone->absence_reason);
        $this->assertNotContains($gone->current_market_property_id, MarketProperty::query()->latestRun()->pluck('id')->all());
    }

    private function publish(array $properties): CrawlerRun
    {
        $contract = MarketDataContractVersion::query()->where('status', 'active')->firstOrFail();
        $operation = CrawlerOperation::query()->create([
            'type' => 'production_crawl',
            'state' => 'succeeded',
            'requested_by' => $this->admin->id,
            'crawl_agency_id' => $this->agency->id,
            'market_data_contract_version_id' => $contract->id,
            'plan' => [],
        ]);
        $snapshot = DiscoverySnapshot::query()->create([
            'operation_id' => $operation->id,
            'crawl_agency_id' => $this->agency->id,
            'url_count' => count($properties),
            'content_hash' => hash('sha256', (string) $operation->id),
        ]);
        $run = CrawlerRun::query()->create([
            'operation_id' => $operation->id,
            'crawl_agency_id' => $this->agency->id,
            'discovery_snapshot_id' => $snapshot->id,
            'market_data_contract_version_id' => $contract->id,
            'quality_policy_version_id' => QualityPolicyVersion::query()->where('status', 'active')->firstOrFail()->id,
            'technical_state' => 'succeeded',
            'result_kind' => 'full',
            'publication_state' => 'candidate',
            'publishable' => true,
            'raw_count' => count($properties),
            'normalized_count' => count($properties),
            'completed_at' => now(),
        ]);
        foreach ($properties as $property) {
            MarketProperty::factory()->create([
                'crawler_run_id' => $run->id,
                'link_imovel' => $property['link_imovel'],
                'valor' => $property['valor'] ?? 100000,
                'payload' => $property,
            ]);
        }
        app(CrawlRunPublicationService::class)->evaluate($run);

        return $run->refresh();
    }
}
