<?php

namespace Tests\Feature\Crawler;

use App\Models\Crawler\CrawlAgency;
use App\Models\Crawler\CrawlAgencyCircuit;
use App\Models\Crawler\CrawlerOperation;
use App\Models\Crawler\DiscoveryPolicyVersion;
use App\Models\Crawler\DiscoverySnapshot;
use App\Models\Crawler\DiscoverySnapshotUrl;
use App\Models\Crawler\ExtractionProfile;
use App\Models\Crawler\MarketDataContractVersion;
use App\Models\CrawlerRun;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ProductionCrawlApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_manual_plan_pins_existing_discovery_approved_profile_and_contract(): void
    {
        [$admin, $agency, $snapshot, $activeProfile, $approvedProfile] = $this->fixtures();

        $response = $this->actingAs($admin)
            ->postJson('/api/v1/admin/crawler/production-crawls', [
                'crawl_agency_id' => $agency->id,
                'discovery_mode' => 'existing',
                'discovery_snapshot_id' => $snapshot->id,
                'extraction_profile_id' => $approvedProfile->id,
            ])
            ->assertCreated()
            ->assertJsonPath('data.type', 'production_crawl')
            ->assertJsonPath('data.plan.discovery.mode', 'existing')
            ->assertJsonPath('data.plan.discovery.snapshot_id', $snapshot->id)
            ->assertJsonPath('data.plan.extraction_profile.id', $approvedProfile->id)
            ->assertJsonPath('data.plan.market_data_contract.id', $approvedProfile->market_data_contract_version_id)
            ->assertJsonPath('data.plan.quality_policy.version', 1);

        $operation = CrawlerOperation::query()->findOrFail($response->json('data.id'));
        $this->assertEquals($approvedProfile->schemas, $operation->plan['extraction_profile']['schemas']);
        $this->assertNotSame($activeProfile->id, $operation->plan['extraction_profile']['id']);
    }

    public function test_manual_existing_snapshot_does_not_require_an_active_discovery_policy(): void
    {
        [$admin, $agency, $snapshot, , $approvedProfile] = $this->fixtures('existing-without-policy');
        $agency->update(['active_discovery_policy_version_id' => null]);

        $response = $this->actingAs($admin)
            ->postJson('/api/v1/admin/crawler/production-crawls', [
                'crawl_agency_id' => $agency->id,
                'discovery_mode' => 'existing',
                'discovery_snapshot_id' => $snapshot->id,
                'extraction_profile_id' => $approvedProfile->id,
            ])
            ->assertCreated()
            ->assertJsonPath('data.plan.discovery.mode', 'existing')
            ->assertJsonPath('data.plan.discovery.snapshot_id', $snapshot->id)
            ->assertJsonPath('data.plan.extraction_profile.id', $approvedProfile->id);

        $this->assertArrayNotHasKey('discovery_policy', $response->json('data.plan'));
    }

    public function test_manual_existing_snapshot_can_exclude_urls_already_imported_by_the_agency(): void
    {
        [$admin, $agency, $snapshot, $profile] = $this->fixtures('only-new');
        $newUrl = "{$agency->base_url}/property/2";
        DiscoverySnapshotUrl::query()->create([
            'discovery_snapshot_id' => $snapshot->id,
            'url' => $newUrl,
            'url_hash' => hash('sha256', $newUrl),
        ]);

        $previousOperation = CrawlerOperation::query()->create([
            'type' => 'production_crawl',
            'state' => 'succeeded',
            'requested_by' => $admin->id,
            'crawl_agency_id' => $agency->id,
            'market_data_contract_version_id' => $profile->market_data_contract_version_id,
            'plan' => ['version' => 1],
        ]);
        $runId = DB::table('crawler.crawl_runs')->insertGetId([
            'operation_id' => $previousOperation->id,
            'crawl_agency_id' => $agency->id,
            'discovery_snapshot_id' => $snapshot->id,
            'extraction_profile_id' => $profile->id,
            'market_data_contract_version_id' => $profile->market_data_contract_version_id,
            'quality_policy_version_id' => DB::table('crawler.quality_policy_versions')->value('id'),
            'technical_state' => 'succeeded',
            'result_kind' => 'full',
            'publication_state' => 'published',
            'publishable' => true,
            'started_at' => now(),
            'completed_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('crawler.market_properties')->insert([
            'crawler_run_id' => $runId,
            'link_imovel' => "{$agency->base_url}/property/1",
            'payload' => json_encode(['link_imovel' => "{$agency->base_url}/property/1"]),
            'normalization_warnings' => json_encode([]),
            'extraction_trace' => json_encode([]),
            'created_at' => now(),
        ]);

        $this->actingAs($admin)
            ->postJson('/api/v1/admin/crawler/production-crawls', [
                'crawl_agency_id' => $agency->id,
                'discovery_mode' => 'existing',
                'discovery_snapshot_id' => $snapshot->id,
                'only_new_urls' => true,
            ])
            ->assertCreated()
            ->assertJsonPath('data.plan.discovery.only_new_urls', true)
            ->assertJsonPath('data.plan.discovery.urls', [$newUrl]);
    }

    public function test_manual_plan_defaults_to_fresh_discovery_and_active_profile(): void
    {
        [$admin, $agency, , $activeProfile, , $activeDiscoveryPolicy] = $this->fixtures();

        $this->actingAs($admin)
            ->postJson('/api/v1/admin/crawler/production-crawls', [
                'crawl_agency_id' => $agency->id,
                'discovery_mode' => 'fresh',
            ])
            ->assertCreated()
            ->assertJsonPath('data.plan.discovery.mode', 'fresh')
            ->assertJsonPath('data.plan.discovery.base_url', $agency->base_url)
            ->assertJsonPath('data.plan.discovery_policy.id', $activeDiscoveryPolicy->id)
            ->assertJsonPath('data.plan.discovery_policy.source', 'agency_active')
            ->assertJsonPath('data.plan.extraction_profile.id', $activeProfile->id);
    }

    public function test_manual_override_is_operation_only_and_can_explicitly_create_a_new_active_version(): void
    {
        [$admin, $agency, , , , $activeDiscoveryPolicy] = $this->fixtures('override');
        $override = DiscoveryPolicyVersion::query()->create([
            'policy_key' => (string) Str::uuid(),
            'name' => 'Override discovery',
            'version' => 1,
            'status' => 'available',
            'strategies' => ['homepage', 'robots'],
            'configuration' => ['max_urls' => 250],
            'created_by' => $admin->id,
        ]);

        $operation = $this->actingAs($admin)
            ->postJson('/api/v1/admin/crawler/production-crawls', [
                'crawl_agency_id' => $agency->id,
                'discovery_mode' => 'fresh',
                'discovery_policy_version_id' => $override->id,
            ])
            ->assertCreated()
            ->assertJsonPath('data.plan.discovery_policy.id', $override->id)
            ->assertJsonPath('data.plan.discovery_policy.source', 'manual_override')
            ->json('data');

        $this->assertSame(
            $activeDiscoveryPolicy->id,
            $agency->refresh()->active_discovery_policy_version_id,
        );

        $this->actingAs($admin)
            ->postJson(
                "/api/v1/admin/crawler/crawl-agencies/{$agency->id}/active-discovery-policy",
                [
                    'source_policy_version_id' => $override->id,
                    'confirmed' => false,
                ],
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors('confirmed');

        $activated = $this->actingAs($admin)
            ->postJson(
                "/api/v1/admin/crawler/crawl-agencies/{$agency->id}/active-discovery-policy",
                [
                    'source_policy_version_id' => $override->id,
                    'confirmed' => true,
                ],
            )
            ->assertOk()
            ->assertJsonPath('data.active_discovery_policy.name', $override->name)
            ->assertJsonPath('data.active_discovery_policy.version', 2)
            ->assertJsonPath('data.active_discovery_policy.source', 'agency_active')
            ->json('data.active_discovery_policy');

        $this->assertNotSame($override->id, $activated['id']);
        $this->assertSame(
            $activated['id'],
            $agency->refresh()->active_discovery_policy_version_id,
        );
        $this->assertSame(
            $override->id,
            CrawlerOperation::query()->findOrFail($operation['id'])
                ->plan['discovery_policy']['id'],
        );
        CrawlerOperation::query()->findOrFail($operation['id'])->update([
            'state' => 'succeeded',
            'completed_at' => now(),
        ]);

        $this->actingAs($admin)
            ->postJson('/api/v1/admin/crawler/production-crawls', [
                'crawl_agency_id' => $agency->id,
                'discovery_mode' => 'fresh',
            ])
            ->assertCreated()
            ->assertJsonPath('data.plan.discovery_policy.id', $activated['id'])
            ->assertJsonPath('data.plan.discovery_policy.source', 'agency_active');

        $this->actingAs($admin)
            ->postJson("/api/v1/admin/crawler/discovery-policy-versions/{$override->id}/archive")
            ->assertOk()
            ->assertJsonPath('data.status', 'archived');
        $this->actingAs($admin)
            ->postJson(
                "/api/v1/admin/crawler/crawl-agencies/{$agency->id}/active-discovery-policy",
                [
                    'source_policy_version_id' => $override->id,
                    'confirmed' => true,
                ],
            )
            ->assertUnprocessable()
            ->assertJsonValidationErrors('source_policy_version_id');

        $this->actingAs($admin)
            ->postJson("/api/v1/admin/crawler/discovery-policy-versions/{$activated['id']}/archive")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('status');
    }

    public function test_plan_preserves_the_profile_fixed_extraction_policy_version(): void
    {
        [$admin, $agency, $snapshot, , $approvedProfile] = $this->fixtures();
        $fixedPolicy = [
            'id' => '019c-fixed-policy-version',
            'name' => 'CSS with final LLM',
            'version' => 4,
            'source' => 'versioned_policy',
            'strategies' => ['css', 'llm_full_html'],
            'configuration' => [],
        ];
        $approvedProfile->update([
            'parameters' => ['extraction_policy' => $fixedPolicy],
        ]);

        $response = $this->actingAs($admin)
            ->postJson('/api/v1/admin/crawler/production-crawls', [
                'crawl_agency_id' => $agency->id,
                'discovery_mode' => 'existing',
                'discovery_snapshot_id' => $snapshot->id,
                'extraction_profile_id' => $approvedProfile->id,
            ])
            ->assertCreated()
            ->assertJsonPath('data.plan.extraction_policy.id', $fixedPolicy['id'])
            ->assertJsonPath('data.plan.extraction_policy.version', 4)
            ->assertJsonPath('data.plan.extraction_policy.strategies.0', 'css')
            ->assertJsonPath('data.plan.extraction_policy.strategies.1', 'llm_full_html');

        $operation = CrawlerOperation::query()->findOrFail($response->json('data.id'));
        $this->assertEquals($fixedPolicy, $operation->plan['extraction_policy']);
    }

    public function test_plan_rejects_discovery_or_profile_from_another_crawl_agency(): void
    {
        [$admin, $agency] = $this->fixtures();
        [, , $foreignSnapshot, $foreignProfile] = $this->fixtures('foreign');

        $this->actingAs($admin)
            ->postJson('/api/v1/admin/crawler/production-crawls', [
                'crawl_agency_id' => $agency->id,
                'discovery_mode' => 'existing',
                'discovery_snapshot_id' => $foreignSnapshot->id,
                'extraction_profile_id' => $foreignProfile->id,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['discovery_snapshot_id', 'extraction_profile_id']);
    }

    public function test_new_production_is_blocked_while_a_candidate_snapshot_awaits_quality(): void
    {
        [$admin, $agency, $snapshot, $profile] = $this->fixtures('pending-quality');
        $operation = CrawlerOperation::query()->create([
            'type' => 'production_crawl',
            'state' => 'succeeded',
            'requested_by' => $admin->id,
            'crawl_agency_id' => $agency->id,
            'market_data_contract_version_id' => $profile->market_data_contract_version_id,
            'plan' => ['version' => 1],
        ]);
        CrawlerRun::query()->create([
            'operation_id' => $operation->id,
            'crawl_agency_id' => $agency->id,
            'discovery_snapshot_id' => $snapshot->id,
            'extraction_profile_id' => $profile->id,
            'market_data_contract_version_id' => $profile->market_data_contract_version_id,
            'quality_policy_version_id' => DB::table('crawler.quality_policy_versions')->where('status', 'active')->value('id'),
            'technical_state' => 'succeeded',
            'result_kind' => 'full',
            'publication_state' => 'candidate',
            'publishable' => false,
            'started_at' => now(),
            'completed_at' => now(),
        ]);

        $this->actingAs($admin)
            ->postJson('/api/v1/admin/crawler/production-crawls', [
                'crawl_agency_id' => $agency->id,
                'discovery_mode' => 'existing',
                'discovery_snapshot_id' => $snapshot->id,
                'extraction_profile_id' => $profile->id,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('crawl_agency_id');
    }

    public function test_bulk_production_queues_every_active_agency_with_its_current_configuration(): void
    {
        [$admin, $firstAgency, , $firstProfile, , $firstPolicy] = $this->fixtures('bulk-first');
        [, $secondAgency, , $secondProfile, , $secondPolicy] = $this->fixtures('bulk-second');
        CrawlAgency::query()->create([
            'name' => 'Agency still onboarding',
            'slug' => 'agency-still-onboarding',
            'base_url' => 'https://onboarding.bulk.example.com',
            'root_domain' => 'onboarding.bulk.example.com',
            'lifecycle_state' => 'onboarding',
        ]);

        $response = $this->actingAs($admin)
            ->postJson('/api/v1/admin/crawler/production-crawls/bulk', [
                'confirmed' => true,
            ])
            ->assertOk()
            ->assertJsonPath('data.summary.active_agencies', 2)
            ->assertJsonPath('data.summary.enqueued', 2)
            ->assertJsonPath('data.summary.skipped', 0)
            ->assertJsonPath('data.group.action', 'bulk_production_crawl')
            ->assertJsonPath('data.group.member_count', 2)
            ->assertJsonPath('data.skipped', []);

        $operations = CrawlerOperation::query()
            ->where('type', 'production_crawl')
            ->orderBy('crawl_agency_id')
            ->get();
        $this->assertCount(2, $operations);
        $this->assertSame([$firstAgency->id, $secondAgency->id], $operations->pluck('crawl_agency_id')->all());
        $this->assertSame([$firstProfile->id, $secondProfile->id], $operations->pluck('plan.extraction_profile.id')->all());
        $this->assertSame([$firstPolicy->id, $secondPolicy->id], $operations->pluck('plan.discovery_policy.id')->all());
        $this->assertSame(['manual_bulk'], $operations->pluck('plan.trigger')->unique()->values()->all());
        $this->assertSame(['fresh'], $operations->pluck('plan.discovery.mode')->unique()->values()->all());
        $this->assertNotNull($response->json('data.group.id'));
    }

    public function test_bulk_production_enqueues_eligible_agencies_and_reports_blockers(): void
    {
        [$admin, $eligible] = $this->fixtures('bulk-eligible');
        [, $circuitOpen] = $this->fixtures('bulk-circuit');
        [, $alreadyRunning, , $runningProfile] = $this->fixtures('bulk-running');
        [, $missingPolicy] = $this->fixtures('bulk-policy');

        CrawlAgencyCircuit::query()->create([
            'crawl_agency_id' => $circuitOpen->id,
            'state' => 'open',
            'opened_at' => now(),
            'reason' => 'Repeated production failures.',
        ]);
        CrawlerOperation::query()->create([
            'type' => 'production_crawl',
            'state' => 'running',
            'requested_by' => $admin->id,
            'crawl_agency_id' => $alreadyRunning->id,
            'market_data_contract_version_id' => $runningProfile->market_data_contract_version_id,
            'plan' => ['version' => 1, 'type' => 'production_crawl'],
        ]);
        $missingPolicy->update(['active_discovery_policy_version_id' => null]);

        $response = $this->actingAs($admin)
            ->postJson('/api/v1/admin/crawler/production-crawls/bulk', [
                'confirmed' => true,
            ])
            ->assertOk()
            ->assertJsonPath('data.summary.active_agencies', 4)
            ->assertJsonPath('data.summary.enqueued', 1)
            ->assertJsonPath('data.summary.skipped', 3)
            ->assertJsonPath('data.group.member_count', 1);

        $skipped = collect($response->json('data.skipped'))->keyBy('crawl_agency.id');
        $this->assertSame('circuit_open', $skipped[$circuitOpen->id]['code']);
        $this->assertSame('production_in_progress', $skipped[$alreadyRunning->id]['code']);
        $this->assertSame('missing_active_discovery_policy', $skipped[$missingPolicy->id]['code']);
        $this->assertDatabaseHas('crawler.operations', [
            'crawl_agency_id' => $eligible->id,
            'type' => 'production_crawl',
            'state' => 'queued',
        ]);
    }

    public function test_bulk_production_requires_confirmation_and_returns_no_group_when_all_are_blocked(): void
    {
        [$admin, $agency] = $this->fixtures('bulk-all-blocked');

        $this->actingAs($admin)
            ->postJson('/api/v1/admin/crawler/production-crawls/bulk', [
                'confirmed' => false,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('confirmed');

        $agency->update(['revalidation_required' => true]);
        $this->actingAs($admin)
            ->postJson('/api/v1/admin/crawler/production-crawls/bulk', [
                'confirmed' => true,
            ])
            ->assertOk()
            ->assertJsonPath('data.summary.active_agencies', 1)
            ->assertJsonPath('data.summary.enqueued', 0)
            ->assertJsonPath('data.summary.skipped', 1)
            ->assertJsonPath('data.group', null)
            ->assertJsonPath('data.skipped.0.code', 'revalidation_required');
    }

    public function test_bulk_production_reports_missing_active_configuration(): void
    {
        [$admin, $missingProfile, , $profile] = $this->fixtures('bulk-missing-profile');
        [, $inactiveContract, , $inactiveContractProfile] = $this->fixtures('bulk-inactive-contract');
        [, $candidateAgency, $candidateSnapshot, $candidateProfile] = $this->fixtures('bulk-candidate');

        $profile->update(['status' => 'approved']);
        $draftContract = MarketDataContractVersion::query()->create([
            'version' => (int) MarketDataContractVersion::query()->max('version') + 1,
            'status' => 'draft',
            'fields' => $inactiveContractProfile->fields,
            'affected_agency_ids' => [],
            'created_by' => $admin->id,
        ]);
        $inactiveContractProfile->update([
            'market_data_contract_version_id' => $draftContract->id,
        ]);
        $candidateOperation = CrawlerOperation::query()->create([
            'type' => 'production_crawl',
            'state' => 'succeeded',
            'requested_by' => $admin->id,
            'crawl_agency_id' => $candidateAgency->id,
            'market_data_contract_version_id' => $candidateProfile->market_data_contract_version_id,
            'plan' => ['version' => 1, 'type' => 'production_crawl'],
        ]);
        CrawlerRun::query()->create([
            'operation_id' => $candidateOperation->id,
            'crawl_agency_id' => $candidateAgency->id,
            'discovery_snapshot_id' => $candidateSnapshot->id,
            'extraction_profile_id' => $candidateProfile->id,
            'market_data_contract_version_id' => $candidateProfile->market_data_contract_version_id,
            'quality_policy_version_id' => DB::table('crawler.quality_policy_versions')->where('status', 'active')->value('id'),
            'technical_state' => 'succeeded',
            'result_kind' => 'full',
            'publication_state' => 'candidate',
            'publishable' => false,
            'started_at' => now(),
            'completed_at' => now(),
        ]);

        $response = $this->actingAs($admin)
            ->postJson('/api/v1/admin/crawler/production-crawls/bulk', [
                'confirmed' => true,
            ])
            ->assertOk()
            ->assertJsonPath('data.summary.active_agencies', 3)
            ->assertJsonPath('data.summary.enqueued', 0)
            ->assertJsonPath('data.summary.skipped', 3)
            ->assertJsonPath('data.group', null);

        $skipped = collect($response->json('data.skipped'))->keyBy('crawl_agency.id');
        $this->assertSame('missing_active_profile', $skipped[$missingProfile->id]['code']);
        $this->assertSame('inactive_contract', $skipped[$inactiveContract->id]['code']);
        $this->assertSame('candidate_snapshot_pending', $skipped[$candidateAgency->id]['code']);
    }

    public function test_bulk_production_reports_a_missing_active_quality_policy(): void
    {
        [$admin] = $this->fixtures('bulk-missing-quality-policy');
        DB::table('crawler.quality_policy_versions')->update(['status' => 'draft']);

        $this->actingAs($admin)
            ->postJson('/api/v1/admin/crawler/production-crawls/bulk', [
                'confirmed' => true,
            ])
            ->assertOk()
            ->assertJsonPath('data.summary.enqueued', 0)
            ->assertJsonPath('data.summary.skipped', 1)
            ->assertJsonPath('data.skipped.0.code', 'missing_active_quality_policy');
    }

    public function test_bulk_production_requires_execute_permission(): void
    {
        [$admin] = $this->fixtures('bulk-permission');
        Role::query()->where('name', 'Platform Admin')->firstOrFail()
            ->revokePermissionTo('crawler.operations.execute');

        $this->actingAs($admin)
            ->postJson('/api/v1/admin/crawler/production-crawls/bulk', [
                'confirmed' => true,
            ])
            ->assertForbidden();
    }

    public function test_production_crawl_is_blocked_when_another_production_is_active(): void
    {
        [$admin, $agency, , $profile] = $this->fixtures('concurrent-production');
        CrawlerOperation::query()->create([
            'type' => 'production_crawl',
            'state' => 'queued',
            'requested_by' => $admin->id,
            'crawl_agency_id' => $agency->id,
            'market_data_contract_version_id' => $profile->market_data_contract_version_id,
            'plan' => ['version' => 1, 'type' => 'production_crawl'],
        ]);

        $this->actingAs($admin)
            ->postJson('/api/v1/admin/crawler/production-crawls', [
                'crawl_agency_id' => $agency->id,
                'discovery_mode' => 'fresh',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('production_crawl');
    }

    public function test_run_records_are_paginated_filtered_sorted_and_expose_evidence(): void
    {
        [$admin, $agency, $snapshot, $profile] = $this->fixtures();
        $operation = CrawlerOperation::query()->create([
            'type' => 'production_crawl',
            'state' => 'failed',
            'requested_by' => $admin->id,
            'crawl_agency_id' => $agency->id,
            'market_data_contract_version_id' => $profile->market_data_contract_version_id,
            'plan' => ['version' => 1],
        ]);
        $runId = DB::table('crawler.crawl_runs')->insertGetId([
            'operation_id' => $operation->id,
            'crawl_agency_id' => $agency->id,
            'discovery_snapshot_id' => $snapshot->id,
            'extraction_profile_id' => $profile->id,
            'market_data_contract_version_id' => $profile->market_data_contract_version_id,
            'quality_policy_version_id' => DB::table('crawler.quality_policy_versions')->value('id'),
            'technical_state' => 'failed',
            'result_kind' => 'partial',
            'publication_state' => 'candidate',
            'publishable' => false,
            'started_at' => now(),
            'completed_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $rawId = DB::table('crawler.raw_properties')->insertGetId([
            'crawler_run_id' => $runId,
            'url' => 'https://validation.example.com/property/1',
            'payload' => json_encode(['bairro' => 'Centro', 'valor' => '200000']),
            'extraction_trace' => json_encode(['bairro' => 'xpath', 'valor' => 'css']),
            'errors' => json_encode([]),
            'created_at' => now(),
        ]);
        foreach ([200000, 150000] as $value) {
            DB::table('crawler.market_properties')->insert([
                'crawler_run_id' => $runId,
                'raw_property_id' => $rawId,
                'tipo' => 'Casa',
                'valor' => $value,
                'bairro' => 'Centro',
                'cidade' => 'Joinville',
                'link_imovel' => "https://validation.example.com/property/{$value}",
                'payload' => json_encode(['bairro' => 'Centro', 'valor' => $value]),
                'normalization_warnings' => json_encode(['review value']),
                'extraction_trace' => json_encode(['valor' => 'css']),
                'created_at' => now(),
            ]);
        }
        DB::table('crawler.rejected_properties')->insert([
            'crawler_run_id' => $runId,
            'raw_property_id' => $rawId,
            'url' => 'https://validation.example.com/property/rejected',
            'payload' => json_encode(['bairro' => 'Centro']),
            'missing_fields' => json_encode(['valor']),
            'errors' => json_encode([]),
            'created_at' => now(),
        ]);

        $this->actingAs($admin)
            ->getJson("/api/v1/admin/crawler/crawl-runs/{$runId}")
            ->assertOk()
            ->assertJsonPath('data.result_kind', 'partial')
            ->assertJsonPath('data.publishable', false);

        $this->actingAs($admin)
            ->getJson("/api/v1/admin/crawler/crawl-runs/{$runId}/records?view=normalized&search=Centro&sort=-valor&per_page=1")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.valor', 200000)
            ->assertJsonPath('data.0.raw_payload.bairro', 'Centro')
            ->assertJsonPath('data.0.normalization_warnings.0', 'review value')
            ->assertJsonPath('data.0.extraction_trace.valor', 'css')
            ->assertJsonPath('meta.total', 2);

        $this->actingAs($admin)
            ->getJson("/api/v1/admin/crawler/crawl-runs/{$runId}/records?view=rejected")
            ->assertOk()
            ->assertJsonPath('data.0.missing_fields.0', 'valor');
    }

    public function test_partition_manager_keeps_default_and_future_months_without_retention(): void
    {
        $this->artisan('crawler:ensure-partitions', ['--months' => 3])->assertSuccessful();

        $partitions = DB::select("SELECT relid::regclass::text AS name FROM pg_partition_tree('crawler.raw_properties')");
        $names = array_column($partitions, 'name');

        $this->assertContains('crawler.raw_properties_default', $names);
        $this->assertTrue(collect($names)->contains(fn (string $name): bool => str_contains($name, now()->addMonths(2)->format('Y_m'))));
    }

    private function fixtures(string $suffix = 'primary'): array
    {
        $admin = User::query()->where('email', 'platform@imobiliaria.com')->firstOrFail();
        $agency = CrawlAgency::query()->create([
            'name' => "Production {$suffix}",
            'slug' => "production-{$suffix}",
            'base_url' => "https://{$suffix}.production.example.com",
            'root_domain' => "{$suffix}.production.example.com",
            'lifecycle_state' => 'active',
        ]);
        $contract = MarketDataContractVersion::query()->where('status', 'active')->first()
            ?? MarketDataContractVersion::query()->create([
                'version' => 1,
                'status' => 'active',
                'fields' => [['name' => 'valor', 'type' => 'decimal', 'required' => true, 'normalization' => []]],
                'affected_agency_ids' => [],
                'created_by' => $admin->id,
            ]);
        $discoveryOperation = CrawlerOperation::query()->create([
            'type' => 'discovery',
            'state' => 'succeeded',
            'requested_by' => $admin->id,
            'crawl_agency_id' => $agency->id,
            'plan' => ['base_url' => $agency->base_url],
        ]);
        $snapshot = DiscoverySnapshot::query()->create([
            'operation_id' => $discoveryOperation->id,
            'crawl_agency_id' => $agency->id,
            'url_count' => 1,
            'content_hash' => str_repeat('c', 64),
        ]);
        DiscoverySnapshotUrl::query()->create([
            'discovery_snapshot_id' => $snapshot->id,
            'url' => "{$agency->base_url}/property/1",
            'url_hash' => hash('sha256', "{$agency->base_url}/property/1"),
        ]);
        $generationOperation = CrawlerOperation::query()->create([
            'type' => 'profile_generation',
            'state' => 'succeeded',
            'requested_by' => $admin->id,
            'crawl_agency_id' => $agency->id,
            'market_data_contract_version_id' => $contract->id,
            'plan' => ['sample_url' => "{$agency->base_url}/property/1"],
        ]);
        $activeProfile = ExtractionProfile::query()->create([
            'crawl_agency_id' => $agency->id,
            'discovery_snapshot_id' => $snapshot->id,
            'market_data_contract_version_id' => $contract->id,
            'created_by_operation_id' => $generationOperation->id,
            'version' => 1,
            'status' => 'active',
            'sample_url' => "{$agency->base_url}/property/1",
            'schemas' => ['xpath' => ['baseSelector' => '//body', 'fields' => []]],
            'strategies' => ['xpath'],
            'fields' => $contract->fields,
            'parameters' => [],
        ]);
        $approvedOperation = CrawlerOperation::query()->create([
            'type' => 'profile_generation',
            'state' => 'succeeded',
            'requested_by' => $admin->id,
            'crawl_agency_id' => $agency->id,
            'market_data_contract_version_id' => $contract->id,
            'plan' => ['sample_url' => "{$agency->base_url}/property/2"],
        ]);
        $approvedProfile = ExtractionProfile::query()->create([
            'crawl_agency_id' => $agency->id,
            'discovery_snapshot_id' => $snapshot->id,
            'market_data_contract_version_id' => $contract->id,
            'created_by_operation_id' => $approvedOperation->id,
            'version' => 2,
            'status' => 'approved',
            'sample_url' => "{$agency->base_url}/property/2",
            'schemas' => ['css' => ['baseSelector' => 'body', 'fields' => []]],
            'strategies' => ['css'],
            'fields' => $contract->fields,
            'parameters' => [],
        ]);
        $activeDiscoveryPolicy = DiscoveryPolicyVersion::query()->create([
            'policy_key' => (string) Str::uuid(),
            'name' => "Production discovery {$suffix}",
            'version' => 1,
            'status' => 'available',
            'strategies' => ['sitemap', 'homepage'],
            'configuration' => ['max_urls' => 500],
            'created_by' => $admin->id,
        ]);
        $agency->update([
            'active_discovery_policy_version_id' => $activeDiscoveryPolicy->id,
        ]);

        return [
            $admin,
            $agency->refresh(),
            $snapshot,
            $activeProfile,
            $approvedProfile,
            $activeDiscoveryPolicy,
        ];
    }
}
