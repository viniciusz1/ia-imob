<?php

namespace Tests\Feature\Crawler;

use App\Models\Crawler\CrawlAgency;
use App\Models\Crawler\CrawlerOperation;
use App\Models\Crawler\DiscoverySnapshot;
use App\Models\Crawler\ExtractionProfile;
use App\Models\Crawler\MarketDataContractVersion;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CrawlerOperationControlApiTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
        $this->admin = User::query()->where('email', 'platform@imobiliaria.com')->firstOrFail();
    }

    public function test_equivalent_pending_crawls_coalesce_but_other_agencies_are_independent(): void
    {
        [$agencyA, $profileA] = $this->activeAgency('coalesce-a');
        [$agencyB] = $this->activeAgency('coalesce-b', $profileA->market_data_contract_version_id);

        $first = $this->actingAs($this->admin)->postJson('/api/v1/admin/crawler/production-crawls', [
            'crawl_agency_id' => $agencyA->id,
            'discovery_mode' => 'fresh',
        ])->assertCreated()->json('data');
        $coalesced = $this->actingAs($this->admin)->postJson('/api/v1/admin/crawler/production-crawls', [
            'crawl_agency_id' => $agencyA->id,
            'discovery_mode' => 'fresh',
        ])->assertOk()->json('data');
        $parallel = $this->actingAs($this->admin)->postJson('/api/v1/admin/crawler/production-crawls', [
            'crawl_agency_id' => $agencyB->id,
            'discovery_mode' => 'fresh',
        ])->assertCreated()->json('data');

        $this->assertSame($first['id'], $coalesced['id']);
        $this->assertNotSame($first['id'], $parallel['id']);
        $this->assertNotNull($first['equivalence_key']);
    }

    public function test_cancel_retry_timeout_and_group_aggregation_preserve_operation_identity(): void
    {
        [$agency, $profile] = $this->activeAgency('control');
        $running = $this->operation($agency, $profile, 'running');
        $failed = $this->operation($agency, $profile, 'failed');
        $succeeded = $this->operation($agency, $profile, 'succeeded');

        $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/operations/{$running->id}/cancel")
            ->assertAccepted()
            ->assertJsonPath('data.state', 'cancellation_requested');

        $retry = $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/operations/{$failed->id}/retry")
            ->assertCreated()
            ->assertJsonPath('data.retry_of_operation_id', $failed->id)
            ->json('data');
        $this->assertNotSame($failed->id, $retry['id']);
        $this->assertSame($failed->plan, CrawlerOperation::query()->findOrFail($retry['id'])->plan);

        $group = $this->actingAs($this->admin)
            ->postJson('/api/v1/admin/crawler/operation-groups', [
                'name' => 'Selected operations',
                'operation_ids' => [$succeeded->id, $failed->id],
            ])
            ->assertCreated()
            ->assertJsonPath('data.member_count', 2)
            ->assertJsonPath('data.result', 'partial')
            ->json('data');

        $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/operation-groups/{$group['id']}/actions", [
                'action' => 'retry',
                'operation_ids' => [$failed->id],
            ])
            ->assertCreated()
            ->assertJsonPath('data.member_count', 1);

        $expired = $running->refresh();
        $expired->forceFill(['lease_expires_at' => now()->subMinute()])->save();
        $this->artisan('crawler:expire-operation-leases')->assertSuccessful();
        $this->assertSame('failed', $expired->refresh()->state);
        $this->assertSame('worker_timeout', $expired->error_code);
        $this->assertNotNull($expired->timed_out_at);
    }

    private function activeAgency(string $suffix, ?int $contractId = null): array
    {
        $agency = CrawlAgency::query()->create([
            'name' => "Control {$suffix}",
            'slug' => "control-{$suffix}",
            'base_url' => "https://{$suffix}.control.example.com",
            'root_domain' => "{$suffix}.control.example.com",
            'lifecycle_state' => 'active',
        ]);
        $contract = $contractId === null
            ? MarketDataContractVersion::query()->create([
                'version' => ((int) MarketDataContractVersion::query()->max('version')) + 1,
                'status' => MarketDataContractVersion::query()->where('status', 'active')->exists() ? 'draft' : 'active',
                'fields' => [['name' => 'url', 'type' => 'url', 'required' => true, 'normalization' => []]],
                'affected_agency_ids' => [],
                'created_by' => $this->admin->id,
            ])
            : MarketDataContractVersion::query()->findOrFail($contractId);
        if ($contract->status !== 'active') {
            $active = MarketDataContractVersion::query()->where('status', 'active')->firstOrFail();
            $contract = $active;
        }
        $discoveryOperation = CrawlerOperation::query()->create([
            'type' => 'discovery', 'state' => 'succeeded', 'requested_by' => $this->admin->id,
            'crawl_agency_id' => $agency->id, 'plan' => ['base_url' => $agency->base_url],
        ]);
        $snapshot = DiscoverySnapshot::query()->create([
            'operation_id' => $discoveryOperation->id,
            'crawl_agency_id' => $agency->id,
            'url_count' => 1,
            'content_hash' => str_repeat('d', 64),
        ]);
        $generation = CrawlerOperation::query()->create([
            'type' => 'profile_generation', 'state' => 'succeeded', 'requested_by' => $this->admin->id,
            'crawl_agency_id' => $agency->id, 'market_data_contract_version_id' => $contract->id,
            'plan' => ['sample_url' => "{$agency->base_url}/property/1"],
        ]);
        $profile = ExtractionProfile::query()->create([
            'crawl_agency_id' => $agency->id,
            'discovery_snapshot_id' => $snapshot->id,
            'market_data_contract_version_id' => $contract->id,
            'created_by_operation_id' => $generation->id,
            'version' => 1,
            'status' => 'active',
            'sample_url' => "{$agency->base_url}/property/1",
            'schemas' => ['xpath' => []],
            'strategies' => ['xpath'],
            'fields' => $contract->fields,
            'parameters' => [],
        ]);

        return [$agency, $profile];
    }

    private function operation(CrawlAgency $agency, ExtractionProfile $profile, string $state, array $extra = []): CrawlerOperation
    {
        return CrawlerOperation::query()->forceCreate([
            'type' => 'production_crawl',
            'state' => $state,
            'requested_by' => $this->admin->id,
            'crawl_agency_id' => $agency->id,
            'market_data_contract_version_id' => $profile->market_data_contract_version_id,
            'plan' => ['version' => 1, 'extraction_profile' => ['id' => $profile->id]],
            'equivalence_key' => hash('sha256', $state.microtime(true)),
            'completed_at' => in_array($state, ['failed', 'succeeded'], true) ? now() : null,
            ...$extra,
        ]);
    }
}
