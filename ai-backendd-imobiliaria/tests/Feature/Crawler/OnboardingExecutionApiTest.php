<?php

namespace Tests\Feature\Crawler;

use App\Models\Crawler\CrawlAgency;
use App\Models\Crawler\CrawlerOperation;
use App\Models\Crawler\DiscoverySnapshot;
use App\Models\Crawler\DiscoverySnapshotUrl;
use App\Models\Crawler\ExtractionProfile;
use App\Models\Crawler\OnboardingExecution;
use App\Models\Crawler\OnboardingPlan;
use App\Models\Crawler\ProfileValidationReport;
use App\Models\Crawler\Prospect;
use App\Models\User;
use App\Services\Crawler\OnboardingExecutionCoordinator;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class OnboardingExecutionApiTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
        $this->admin = User::query()->where('email', 'platform@imobiliaria.com')->firstOrFail();
    }

    public function test_confirmation_is_idempotent_and_freezes_exact_policy_versions_without_queuing_work(): void
    {
        [$agency, $plan] = $this->promoteProspect();
        $model = $this->createCatalog();

        $this->actingAs($this->admin)
            ->putJson("/api/v1/admin/crawler/crawl-agencies/{$agency->id}/onboarding-plan", [
                'name' => 'Portais com sitemap e JSON-LD',
                'conduction' => 'automated',
                'execution_model_version_id' => $model['id'],
                'first_production_discovery_mode' => 'validation_snapshot',
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Portais com sitemap e JSON-LD')
            ->assertJsonPath('data.conduction', 'automated')
            ->assertJsonPath(
                'data.first_production_discovery_mode',
                'validation_snapshot',
            );

        $first = $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/crawl-agencies/{$agency->id}/onboarding-plan/confirm")
            ->assertCreated()
            ->assertJsonPath('data.state', 'queued')
            ->assertJsonPath(
                'data.first_production_discovery_mode',
                'validation_snapshot',
            )
            ->assertJsonPath('data.next_action', 'wait_for_coordinator')
            ->assertJsonCount(0, 'data.operations')
            ->json('data');

        $this->assertDatabaseCount('crawler.operations', 0);
        $this->assertSame('in_progress', $plan->refresh()->status);

        $second = $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/crawl-agencies/{$agency->id}/onboarding-plan/confirm")
            ->assertOk()
            ->json('data');

        $this->assertSame($first['id'], $second['id']);
        $this->assertDatabaseCount('crawler.onboarding_executions', 1);

        $execution = OnboardingExecution::query()->findOrFail($first['id']);
        $frozen = $execution->resolved_configuration;
        $draft = $this->actingAs($this->admin)
            ->postJson(
                "/api/v1/admin/crawler/discovery-policy-versions/{$model['discovery_policy_version_id']}/versions",
            )
            ->assertCreated()
            ->json('data');
        $this->actingAs($this->admin)
            ->putJson("/api/v1/admin/crawler/discovery-policy-versions/{$draft['id']}", [
                'strategies' => ['sitemap'],
                'configuration' => ['max_urls' => 99],
            ])
            ->assertOk();

        $this->assertSame($frozen, $execution->refresh()->resolved_configuration);
        $this->assertSame($model['id'], $execution->execution_model_version_id);
        $this->assertSame($model['discovery_policy_version_id'], $execution->discovery_policy_version_id);
        $this->assertSame($model['extraction_policy_version_id'], $execution->extraction_policy_version_id);
    }

    public function test_database_allows_only_one_nonterminal_execution_per_agency(): void
    {
        [$agency] = $this->promoteProspect();
        $execution = $this->configuredExecution($agency);
        $attributes = $execution->getAttributes();
        unset($attributes['id'], $attributes['created_at'], $attributes['updated_at']);
        $attributes['name'] = 'Conflicting execution';
        $blocked = false;

        try {
            DB::transaction(fn () => OnboardingExecution::query()->create($attributes));
        } catch (QueryException) {
            $blocked = true;
        }

        $this->assertTrue($blocked, 'The partial unique index must reject a second nonterminal execution.');
        $this->assertDatabaseCount('crawler.onboarding_executions', 1);
    }

    public function test_active_onboarding_prevents_a_parallel_standalone_profile_validation(): void
    {
        [$agency] = $this->promoteProspect('validation-owner');
        $execution = $this->configuredExecution($agency, 'Validation owner');
        $discovery = CrawlerOperation::query()->create([
            'type' => 'discovery',
            'state' => 'succeeded',
            'requested_by' => $this->admin->id,
            'crawl_agency_id' => $agency->id,
            'plan' => ['base_url' => $agency->base_url],
        ]);
        $snapshot = DiscoverySnapshot::query()->create([
            'operation_id' => $discovery->id,
            'crawl_agency_id' => $agency->id,
            'url_count' => 1,
            'content_hash' => str_repeat('a', 64),
        ]);
        DiscoverySnapshotUrl::query()->create([
            'discovery_snapshot_id' => $snapshot->id,
            'url' => "{$agency->base_url}/property/1",
            'url_hash' => hash('sha256', "{$agency->base_url}/property/1"),
        ]);
        $generation = CrawlerOperation::query()->create([
            'type' => 'profile_generation',
            'state' => 'succeeded',
            'requested_by' => $this->admin->id,
            'crawl_agency_id' => $agency->id,
            'market_data_contract_version_id' => $execution->market_data_contract_version_id,
            'plan' => ['sample_url' => "{$agency->base_url}/property/1"],
        ]);
        $profile = ExtractionProfile::query()->create([
            'crawl_agency_id' => $agency->id,
            'discovery_snapshot_id' => $snapshot->id,
            'market_data_contract_version_id' => $execution->market_data_contract_version_id,
            'created_by_operation_id' => $generation->id,
            'version' => 1,
            'status' => 'candidate',
            'sample_url' => "{$agency->base_url}/property/1",
            'schemas' => [],
            'strategies' => ['xpath'],
            'fields' => $execution->resolved_configuration['market_data_contract']['fields'],
            'parameters' => [],
        ]);

        $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/extraction-profiles/{$profile->id}/validation")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('onboarding_execution');
    }

    public function test_coordinator_advances_once_per_step_and_stops_at_awaiting_approval(): void
    {
        [$agency] = $this->promoteProspect();
        $execution = $this->configuredExecution($agency);
        $coordinator = app(OnboardingExecutionCoordinator::class);

        $coordinator->reconcile($execution);
        $coordinator->reconcile($execution);

        $discovery = CrawlerOperation::query()
            ->where('onboarding_execution_id', $execution->id)
            ->where('onboarding_step', 'discovery')
            ->sole();
        $this->assertSame(1, $discovery->attempt);
        $this->assertDatabaseCount('crawler.operations', 1);

        $snapshot = DiscoverySnapshot::query()->create([
            'operation_id' => $discovery->id,
            'crawl_agency_id' => $agency->id,
            'url_count' => 4,
            'content_hash' => str_repeat('d', 64),
        ]);
        foreach ([
            "{$agency->base_url}/",
            'https://outside.example.com/property/ignored',
            "{$agency->base_url}/property/selected-first",
            "{$agency->base_url}/property/selected-later",
        ] as $url) {
            DiscoverySnapshotUrl::query()->create([
                'discovery_snapshot_id' => $snapshot->id,
                'url' => $url,
                'url_hash' => hash('sha256', $url),
            ]);
        }
        $this->succeed($discovery, ['discovery_snapshot_id' => $snapshot->id]);

        $execution = $coordinator->reconcile($execution);
        $this->assertSame("{$agency->base_url}/property/selected-first", $execution->sample_url);
        $this->assertSame('preferred_detail_snapshot_url', $execution->sample_url_selection['method']);
        $generation = CrawlerOperation::query()
            ->where('onboarding_execution_id', $execution->id)
            ->where('onboarding_step', 'profile_generation')
            ->sole();
        $this->assertSame('automated_onboarding_selection', $generation->plan['sample_url_confirmation_source']);
        $this->assertSame(
            $execution->resolved_configuration['extraction_policy'],
            $generation->plan['extraction_policy'],
        );

        $profile = ExtractionProfile::query()->create([
            'crawl_agency_id' => $agency->id,
            'discovery_snapshot_id' => $snapshot->id,
            'market_data_contract_version_id' => $execution->market_data_contract_version_id,
            'created_by_operation_id' => $generation->id,
            'version' => 1,
            'status' => 'candidate',
            'sample_url' => $execution->sample_url,
            'schemas' => ['xpath' => ['baseSelector' => '//body', 'fields' => []]],
            'strategies' => ['xpath'],
            'fields' => $execution->resolved_configuration['market_data_contract']['fields'],
            'parameters' => [],
        ]);
        $this->succeed($generation, ['extraction_profile_id' => $profile->id]);

        $execution = $coordinator->reconcile($execution);
        $validation = CrawlerOperation::query()
            ->where('onboarding_execution_id', $execution->id)
            ->where('onboarding_step', 'profile_validation')
            ->sole();
        ProfileValidationReport::query()->create([
            'operation_id' => $validation->id,
            'extraction_profile_id' => $profile->id,
            'sampled_url_count' => 4,
            'valid_record_count' => 3,
            'valid_ratio' => 0.75,
            'required_field_coverage' => ['title' => 1.0],
            'blocking_failures' => ['low_valid_ratio'],
            'warnings' => [],
            'eligible' => false,
        ]);
        $this->succeed($validation, ['profile_validation_report_id' => 1]);

        $execution = $coordinator->reconcile($execution);
        $coordinator->reconcile($execution);

        $this->assertSame('awaiting_approval', $execution->state);
        $this->assertSame('approval', $execution->current_step);
        $this->assertDatabaseCount('crawler.operations', 3);
        $this->assertDatabaseMissing('crawler.operations', ['type' => 'production_crawl']);

        $this->actingAs($this->admin)
            ->getJson("/api/v1/admin/crawler/onboarding-executions/{$execution->id}")
            ->assertOk()
            ->assertJsonPath('data.next_action', 'decide_onboarding')
            ->assertJsonPath('data.steps.3.state', 'awaiting_approval')
            ->assertJsonCount(3, 'data.operations')
            ->assertJsonMissingPath('data.operations.0.plan');
    }

    public function test_coordinator_prefers_a_property_detail_url_over_a_search_page(): void
    {
        [$agency] = $this->promoteProspect('preferred-detail');
        $execution = $this->configuredExecution($agency, 'Preferred detail model');
        $coordinator = app(OnboardingExecutionCoordinator::class);
        $coordinator->reconcile($execution);
        $discovery = $execution->operations()->where('onboarding_step', 'discovery')->sole();
        $snapshot = DiscoverySnapshot::query()->create([
            'operation_id' => $discovery->id,
            'crawl_agency_id' => $agency->id,
            'url_count' => 2,
            'content_hash' => str_repeat('f', 64),
        ]);
        foreach ([
            "{$agency->base_url}/imoveis/venda/apartamento/jaragua-do-sul",
            "{$agency->base_url}/2494",
        ] as $url) {
            DiscoverySnapshotUrl::query()->create([
                'discovery_snapshot_id' => $snapshot->id,
                'url' => $url,
                'url_hash' => hash('sha256', $url),
            ]);
        }
        $this->succeed($discovery, ['discovery_snapshot_id' => $snapshot->id]);

        $execution = $coordinator->reconcile($execution);

        $this->assertSame("{$agency->base_url}/2494", $execution->sample_url);
        $this->assertSame('preferred_detail_snapshot_url', $execution->sample_url_selection['method']);
    }

    public function test_missing_sample_or_failed_child_requires_attention_without_erasing_completed_work(): void
    {
        [$agency] = $this->promoteProspect();
        $execution = $this->configuredExecution($agency);
        $coordinator = app(OnboardingExecutionCoordinator::class);
        $coordinator->reconcile($execution);
        $discovery = $execution->operations()->where('onboarding_step', 'discovery')->sole();
        $snapshot = DiscoverySnapshot::query()->create([
            'operation_id' => $discovery->id,
            'crawl_agency_id' => $agency->id,
            'url_count' => 2,
            'content_hash' => str_repeat('e', 64),
        ]);
        foreach (["{$agency->base_url}/", 'https://outside.example.com/property/1'] as $url) {
            DiscoverySnapshotUrl::query()->create([
                'discovery_snapshot_id' => $snapshot->id,
                'url' => $url,
                'url_hash' => hash('sha256', $url),
            ]);
        }
        $this->succeed($discovery, ['discovery_snapshot_id' => $snapshot->id]);

        $execution = $coordinator->reconcile($execution);

        $this->assertSame('requires_attention', $execution->state);
        $this->assertSame('eligible_sample_url_missing', $execution->attention_code);
        $this->assertSame('succeeded', $discovery->refresh()->state);
        $this->assertDatabaseCount('crawler.operations', 1);

        $this->actingAs($this->admin)
            ->getJson("/api/v1/admin/crawler/onboarding-executions/{$execution->id}")
            ->assertOk()
            ->assertJsonCount(2, 'data.recovery_actions')
            ->assertJsonPath('data.recovery_actions.0.key', 'use_existing_discovery_snapshot')
            ->assertJsonPath('data.recovery_actions.0.enabled', true)
            ->assertJsonPath('data.recovery_actions.1.key', 'create_custom_discovery')
            ->assertJsonPath('data.recovery_actions.1.enabled', true);

        [$otherAgency] = $this->promoteProspect('failure');
        $failedExecution = $this->configuredExecution($otherAgency, 'Failure model');
        $coordinator->reconcile($failedExecution);
        $failedChild = $failedExecution->operations()->sole();
        $failedChild->forceFill([
            'state' => 'failed',
            'error_code' => 'discovery_failed',
            'error_message' => 'Deterministic adapter failure.',
            'completed_at' => now(),
        ])->save();

        $failedExecution = $coordinator->reconcile($failedExecution);
        $this->assertSame('requires_attention', $failedExecution->state);
        $this->assertSame('child_operation_failed', $failedExecution->attention_code);
        $this->assertSame('failed', $failedChild->refresh()->state);

        $this->actingAs($this->admin)
            ->getJson("/api/v1/admin/crawler/onboarding-executions/{$failedExecution->id}")
            ->assertOk()
            ->assertJsonPath('data.next_action', 'retry_failed_operation');
    }

    public function test_catalog_and_execution_endpoints_respect_existing_permissions(): void
    {
        $this->getJson('/api/v1/admin/crawler/discovery-policy-versions')
            ->assertUnauthorized();

        [$agency] = $this->promoteProspect();
        $viewer = User::factory()->create(['agency_id' => null]);
        $viewer->givePermissionTo(Permission::findByName('crawler.view', 'web'));

        $this->actingAs($viewer)
            ->getJson('/api/v1/admin/crawler/discovery-policy-versions')
            ->assertOk();

        $this->actingAs($viewer)
            ->postJson('/api/v1/admin/crawler/discovery-policy-versions', [
                'name' => 'Forbidden',
                'strategies' => ['sitemap'],
            ])
            ->assertForbidden();

        $this->actingAs($viewer)
            ->putJson("/api/v1/admin/crawler/crawl-agencies/{$agency->id}/onboarding-plan", [
                'name' => 'Forbidden',
                'conduction' => 'automated',
                'execution_model_version_id' => 1,
            ])
            ->assertForbidden();
    }

    public function test_execution_history_is_newest_first_and_identifies_its_creator(): void
    {
        [$agency] = $this->promoteProspect('history');
        $older = $this->configuredExecution($agency, 'Older execution');
        $older->forceFill([
            'state' => 'cancelled',
            'completed_at' => now()->subDay(),
            'created_at' => now()->subDay(),
            'updated_at' => now()->subDay(),
        ])->save();
        $operator = User::factory()->create(['name' => 'Crawler Operator']);
        $attributes = $older->getAttributes();
        unset($attributes['id'], $attributes['created_at'], $attributes['updated_at']);
        $attributes['name'] = 'Newer execution';
        $attributes['state'] = 'completed';
        $attributes['completed_at'] = now();
        $attributes['created_by'] = $operator->id;
        $newer = OnboardingExecution::query()->create($attributes);

        $viewer = User::factory()->create(['agency_id' => null]);
        $viewer->givePermissionTo(Permission::findByName('crawler.view', 'web'));

        $this->actingAs($viewer)
            ->getJson("/api/v1/admin/crawler/crawl-agencies/{$agency->id}/onboarding-executions")
            ->assertOk()
            ->assertJsonPath('data.0.id', $newer->id)
            ->assertJsonPath('data.0.created_by.id', $operator->id)
            ->assertJsonPath('data.0.created_by.name', 'Crawler Operator')
            ->assertJsonPath('data.1.id', $older->id);
    }

    public function test_configuration_failure_exposes_human_recovery_options(): void
    {
        [$agency] = $this->promoteProspect('invalid-source');
        $execution = $this->configuredExecution($agency, 'Invalid source model');
        $coordinator = app(OnboardingExecutionCoordinator::class);
        $coordinator->reconcile($execution);

        $failed = $execution->operations()->sole();
        $failed->forceFill([
            'state' => 'failed',
            'error_code' => 'discovery_failed',
            'error_message' => "Invalid source(s): {'contract_discoverer_abc'}. Valid: {'sitemap', 'robots'}",
            'completed_at' => now(),
        ])->save();
        $coordinator->reconcile($execution);

        $this->actingAs($this->admin)
            ->getJson("/api/v1/admin/crawler/onboarding-executions/{$execution->id}")
            ->assertOk()
            ->assertJsonPath('data.attention.category', 'configuration')
            ->assertJsonPath(
                'data.attention.message',
                'A configuração de Discovery usa uma fonte sem suporte do worker. Revise a configuração antes de tentar novamente.',
            )
            ->assertJsonPath('data.recovery_actions.0.key', 'review_configuration')
            ->assertJsonPath('data.recovery_actions.0.priority', 'primary')
            ->assertJsonPath('data.recovery_actions.0.enabled', true)
            ->assertJsonPath('data.recovery_actions.1.key', 'retry_failed_operation')
            ->assertJsonPath('data.recovery_actions.1.priority', 'secondary')
            ->assertJsonPath('data.recovery_actions.1.enabled', true)
            ->assertJsonPath('data.recovery_actions.2.key', 'use_existing_discovery_snapshot')
            ->assertJsonPath('data.recovery_actions.2.priority', 'secondary')
            ->assertJsonPath('data.recovery_actions.2.enabled', true)
            ->assertJsonPath('data.recovery_actions.3.key', 'create_custom_discovery')
            ->assertJsonPath('data.recovery_actions.3.priority', 'secondary')
            ->assertJsonPath('data.recovery_actions.3.enabled', true);
    }

    public function test_transient_failure_prioritizes_retry(): void
    {
        [$agency] = $this->promoteProspect('worker-timeout');
        $execution = $this->configuredExecution($agency, 'Transient failure model');
        $coordinator = app(OnboardingExecutionCoordinator::class);
        $coordinator->reconcile($execution);

        $failed = $execution->operations()->sole();
        $failed->forceFill([
            'state' => 'failed',
            'error_code' => 'worker_timeout',
            'error_message' => 'Lease expired after 60 seconds at worker-17.',
            'completed_at' => now(),
        ])->save();
        $coordinator->reconcile($execution);

        $this->actingAs($this->admin)
            ->getJson("/api/v1/admin/crawler/onboarding-executions/{$execution->id}")
            ->assertOk()
            ->assertJsonPath('data.attention.category', 'transient')
            ->assertJsonPath(
                'data.attention.message',
                'A etapa falhou por um problema transitório e pode ser retentada.',
            )
            ->assertJsonPath('data.next_action', 'retry_failed_operation')
            ->assertJsonCount(3, 'data.recovery_actions')
            ->assertJsonPath('data.recovery_actions.0.key', 'retry_failed_operation')
            ->assertJsonPath('data.recovery_actions.0.priority', 'primary')
            ->assertJsonPath('data.recovery_actions.1.key', 'use_existing_discovery_snapshot')
            ->assertJsonPath('data.recovery_actions.2.key', 'create_custom_discovery');
    }

    public function test_repeated_retry_returns_the_existing_active_attempt(): void
    {
        [$agency] = $this->promoteProspect('idempotent-retry');
        $execution = $this->configuredExecution($agency, 'Idempotent retry model');
        $coordinator = app(OnboardingExecutionCoordinator::class);
        $coordinator->reconcile($execution);

        $failed = $execution->operations()->sole();
        $failed->forceFill([
            'state' => 'failed',
            'error_code' => 'worker_timeout',
            'error_message' => 'The worker timed out.',
            'completed_at' => now(),
        ])->save();
        $coordinator->reconcile($execution);

        $firstRetry = $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/operations/{$failed->id}/retry")
            ->assertCreated()
            ->json('data');

        $repeatedRetry = $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/operations/{$failed->id}/retry")
            ->assertOk()
            ->json('data');

        $this->assertSame($firstRetry['id'], $repeatedRetry['id']);
        $this->assertSame(2, CrawlerOperation::query()
            ->where('onboarding_execution_id', $execution->id)
            ->count());
        $this->assertSame('running', $execution->refresh()->state);
    }

    public function test_automated_execution_adopts_an_independent_discovery_snapshot_and_continues(): void
    {
        [$agency] = $this->promoteProspect('adopt-snapshot');
        $execution = $this->configuredExecution($agency, 'Adoption model');
        $coordinator = app(OnboardingExecutionCoordinator::class);
        $coordinator->reconcile($execution);
        $failed = $execution->operations()->sole();
        $failed->forceFill([
            'state' => 'failed',
            'error_code' => 'discovery_failed',
            'error_message' => 'The pinned Discovery failed.',
            'completed_at' => now(),
        ])->save();
        $coordinator->reconcile($execution);

        $sourceOperation = CrawlerOperation::query()->create([
            'type' => 'discovery',
            'state' => 'succeeded',
            'requested_by' => $this->admin->id,
            'crawl_agency_id' => $agency->id,
            'market_data_contract_version_id' => $execution->market_data_contract_version_id,
            'plan' => ['discovery_policy' => ['strategies' => ['sitemap']]],
            'completed_at' => now(),
        ]);
        $snapshot = DiscoverySnapshot::query()->create([
            'operation_id' => $sourceOperation->id,
            'crawl_agency_id' => $agency->id,
            'url_count' => 2,
            'content_hash' => str_repeat('a', 64),
        ]);
        foreach (["{$agency->base_url}/", "{$agency->base_url}/imovel/123"] as $url) {
            DiscoverySnapshotUrl::query()->create([
                'discovery_snapshot_id' => $snapshot->id,
                'url' => $url,
                'url_hash' => hash('sha256', $url),
            ]);
        }

        $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/onboarding-executions/{$execution->id}/adopt-discovery-snapshot", [
                'discovery_snapshot_id' => $snapshot->id,
                'note' => 'Discovery validado manualmente.',
            ])
            ->assertOk()
            ->assertJsonPath('data.discovery_snapshot_id', $snapshot->id)
            ->assertJsonPath('data.sample_url', "{$agency->base_url}/imovel/123")
            ->assertJsonPath('data.current_step', 'profile_generation')
            ->assertJsonPath('data.state', 'running')
            ->assertJsonPath('data.discovery_adoption.discovery_snapshot_id', $snapshot->id)
            ->assertJsonPath('data.discovery_adoption.source_operation_id', $sourceOperation->id)
            ->assertJsonPath('data.discovery_adoption.replaced_operation_id', $failed->id)
            ->assertJsonPath('data.discovery_adoption.adopted_by.id', $this->admin->id)
            ->assertJsonPath('data.discovery_adoption.note', 'Discovery validado manualmente.');

        $this->assertDatabaseHas('crawler.onboarding_discovery_adoptions', [
            'onboarding_execution_id' => $execution->id,
            'discovery_snapshot_id' => $snapshot->id,
            'source_operation_id' => $sourceOperation->id,
            'replaced_operation_id' => $failed->id,
            'adopted_by' => $this->admin->id,
            'note' => 'Discovery validado manualmente.',
        ]);
        $this->assertNull($sourceOperation->refresh()->onboarding_execution_id);
        $this->assertDatabaseHas('crawler.operations', [
            'onboarding_execution_id' => $execution->id,
            'onboarding_step' => 'profile_generation',
            'state' => 'queued',
            'attempt' => 1,
        ]);
        $this->assertSame('failed', $failed->refresh()->state);

        $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/onboarding-executions/{$execution->id}/adopt-discovery-snapshot", [
                'discovery_snapshot_id' => $snapshot->id,
                'note' => 'Comando repetido pelo operador.',
            ])
            ->assertOk()
            ->assertJsonPath('data.discovery_snapshot_id', $snapshot->id)
            ->assertJsonPath('data.current_step', 'profile_generation');

        $this->assertDatabaseCount('crawler.onboarding_discovery_adoptions', 1);
        $this->assertSame(1, CrawlerOperation::query()
            ->where('onboarding_execution_id', $execution->id)
            ->where('onboarding_step', 'profile_generation')
            ->count());

        $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/operations/{$failed->id}/retry")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('state');
        $this->assertSame(1, CrawlerOperation::query()
            ->where('onboarding_execution_id', $execution->id)
            ->where('onboarding_step', 'discovery')
            ->count());
    }

    public function test_automated_execution_adopts_a_snapshot_after_successful_discovery_has_no_sample(): void
    {
        [$agency] = $this->promoteProspect('adopt-after-empty');
        $execution = $this->configuredExecution($agency, 'Empty Discovery adoption model');
        $coordinator = app(OnboardingExecutionCoordinator::class);
        $coordinator->reconcile($execution);
        $completed = $execution->operations()->sole();
        $emptySnapshot = DiscoverySnapshot::query()->create([
            'operation_id' => $completed->id,
            'crawl_agency_id' => $agency->id,
            'url_count' => 0,
            'content_hash' => str_repeat('0', 64),
        ]);
        $this->succeed($completed, ['discovery_snapshot_id' => $emptySnapshot->id]);
        $coordinator->reconcile($execution);

        $sourceOperation = CrawlerOperation::query()->create([
            'type' => 'discovery',
            'state' => 'succeeded',
            'requested_by' => $this->admin->id,
            'crawl_agency_id' => $agency->id,
            'market_data_contract_version_id' => $execution->market_data_contract_version_id,
            'plan' => ['discovery_policy' => ['strategies' => ['sitemap']]],
            'completed_at' => now(),
        ]);
        $snapshot = DiscoverySnapshot::query()->create([
            'operation_id' => $sourceOperation->id,
            'crawl_agency_id' => $agency->id,
            'url_count' => 1,
            'content_hash' => str_repeat('1', 64),
        ]);
        DiscoverySnapshotUrl::query()->create([
            'discovery_snapshot_id' => $snapshot->id,
            'url' => "{$agency->base_url}/imovel/123",
            'url_hash' => hash('sha256', "{$agency->base_url}/imovel/123"),
        ]);

        $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/onboarding-executions/{$execution->id}/adopt-discovery-snapshot", [
                'discovery_snapshot_id' => $snapshot->id,
            ])
            ->assertOk()
            ->assertJsonPath('data.discovery_adoption.replaced_operation_id', $completed->id)
            ->assertJsonPath('data.current_step', 'profile_generation')
            ->assertJsonPath('data.state', 'running');

        $this->assertSame('succeeded', $completed->refresh()->state);
    }

    public function test_discovery_adoption_rejects_a_snapshot_whose_source_operation_belongs_to_another_agency(): void
    {
        [$agency] = $this->promoteProspect('adopt-target');
        [$otherAgency] = $this->promoteProspect('adopt-source');
        $execution = $this->configuredExecution($agency, 'Adoption ownership model');
        $coordinator = app(OnboardingExecutionCoordinator::class);
        $coordinator->reconcile($execution);
        $failed = $execution->operations()->sole();
        $failed->forceFill([
            'state' => 'failed',
            'error_code' => 'discovery_failed',
            'error_message' => 'The pinned Discovery failed.',
            'completed_at' => now(),
        ])->save();
        $coordinator->reconcile($execution);

        $sourceOperation = CrawlerOperation::query()->create([
            'type' => 'discovery',
            'state' => 'succeeded',
            'requested_by' => $this->admin->id,
            'crawl_agency_id' => $otherAgency->id,
            'market_data_contract_version_id' => $execution->market_data_contract_version_id,
            'plan' => [],
        ]);
        $snapshot = DiscoverySnapshot::query()->create([
            'operation_id' => $sourceOperation->id,
            'crawl_agency_id' => $agency->id,
            'url_count' => 1,
            'content_hash' => str_repeat('b', 64),
        ]);
        DiscoverySnapshotUrl::query()->create([
            'discovery_snapshot_id' => $snapshot->id,
            'url' => "{$agency->base_url}/imovel/123",
            'url_hash' => hash('sha256', "{$agency->base_url}/imovel/123"),
        ]);

        $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/onboarding-executions/{$execution->id}/adopt-discovery-snapshot", [
                'discovery_snapshot_id' => $snapshot->id,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('discovery_snapshot_id');

        $this->assertDatabaseCount('crawler.onboarding_discovery_adoptions', 0);
        $this->assertSame('requires_attention', $execution->refresh()->state);
    }

    public function test_discovery_adoption_candidates_explain_eligibility_and_snapshot_age(): void
    {
        [$agency] = $this->promoteProspect('adoption-candidates');
        $execution = $this->configuredExecution($agency, 'Adoption candidates model');
        $coordinator = app(OnboardingExecutionCoordinator::class);
        $coordinator->reconcile($execution);
        $failed = $execution->operations()->sole();
        $failed->forceFill([
            'state' => 'failed',
            'error_code' => 'discovery_failed',
            'error_message' => 'The pinned Discovery failed.',
            'completed_at' => now(),
        ])->save();
        $coordinator->reconcile($execution);

        $eligibleOperation = CrawlerOperation::query()->create([
            'type' => 'discovery',
            'state' => 'succeeded',
            'requested_by' => $this->admin->id,
            'crawl_agency_id' => $agency->id,
            'market_data_contract_version_id' => $execution->market_data_contract_version_id,
            'plan' => [],
        ]);
        $eligibleSnapshot = DiscoverySnapshot::query()->create([
            'operation_id' => $eligibleOperation->id,
            'crawl_agency_id' => $agency->id,
            'url_count' => 1,
            'content_hash' => str_repeat('c', 64),
            'created_at' => now()->subDays(45),
        ]);
        DiscoverySnapshotUrl::query()->create([
            'discovery_snapshot_id' => $eligibleSnapshot->id,
            'url' => "{$agency->base_url}/imovel/elegivel",
            'url_hash' => hash('sha256', "{$agency->base_url}/imovel/elegivel"),
        ]);

        $failedOperation = CrawlerOperation::query()->create([
            'type' => 'discovery',
            'state' => 'failed',
            'requested_by' => $this->admin->id,
            'crawl_agency_id' => $agency->id,
            'market_data_contract_version_id' => $execution->market_data_contract_version_id,
            'plan' => [],
        ]);
        $ineligibleSnapshot = DiscoverySnapshot::query()->create([
            'operation_id' => $failedOperation->id,
            'crawl_agency_id' => $agency->id,
            'url_count' => 1,
            'content_hash' => str_repeat('d', 64),
        ]);
        DiscoverySnapshotUrl::query()->create([
            'discovery_snapshot_id' => $ineligibleSnapshot->id,
            'url' => "{$agency->base_url}/imovel/parcial",
            'url_hash' => hash('sha256', "{$agency->base_url}/imovel/parcial"),
        ]);

        $this->actingAs($this->admin)
            ->getJson("/api/v1/admin/crawler/onboarding-executions/{$execution->id}/discovery-snapshot-candidates")
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $ineligibleSnapshot->id)
            ->assertJsonPath('data.0.adoption.eligible', false)
            ->assertJsonPath(
                'data.0.adoption.reason',
                'A Operação do Crawler de origem não terminou com sucesso.',
            )
            ->assertJsonPath('data.1.id', $eligibleSnapshot->id)
            ->assertJsonPath('data.1.adoption.eligible', true)
            ->assertJsonPath('data.1.adoption.sample_url', "{$agency->base_url}/imovel/elegivel")
            ->assertJsonPath(
                'data.1.adoption.age_warning',
                'Snapshot criado há mais de 30 dias; confirme se as URLs ainda representam o site atual.',
            );
    }

    private function promoteProspect(string $suffix = 'success'): array
    {
        $operationCount = CrawlerOperation::query()->count();
        $prospect = Prospect::query()->create([
            'root_domain' => "onboarding-{$suffix}.example.com",
            'google_place_id' => "place-onboarding-{$suffix}",
            'name' => "Onboarding {$suffix}",
            'city' => 'Joinville',
            'state' => 'SC',
            'base_url' => "https://onboarding-{$suffix}.example.com",
            'source' => 'google_places',
            'automatic_classification' => 'candidate',
            'review_state' => 'approved',
            'reviewed_by' => $this->admin->id,
            'reviewed_at' => now(),
            'review_reason' => 'Approved for onboarding.',
            'metadata' => [],
        ]);

        $response = $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/prospects/{$prospect->id}/promote")
            ->assertCreated()
            ->assertJsonPath('data.onboarding_plan.status', 'draft');

        $agency = CrawlAgency::query()->findOrFail($response->json('data.crawl_agency.id'));
        $plan = OnboardingPlan::query()->where('crawl_agency_id', $agency->id)->sole();
        $this->assertSame($operationCount, CrawlerOperation::query()->count());

        return [$agency, $plan];
    }

    private function createCatalog(string $name = 'Default onboarding'): array
    {
        $discovery = $this->actingAs($this->admin)
            ->postJson('/api/v1/admin/crawler/discovery-policy-versions', [
                'name' => "{$name} discovery",
                'strategies' => ['sitemap', 'homepage'],
                'configuration' => ['max_urls' => 1000],
            ])
            ->assertCreated()
            ->json('data');
        $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/discovery-policy-versions/{$discovery['id']}/publish")
            ->assertOk();
        $extraction = $this->actingAs($this->admin)
            ->postJson('/api/v1/admin/crawler/extraction-policy-versions', [
                'name' => "{$name} extraction",
                'strategies' => ['xpath', 'css'],
                'configuration' => [],
            ])
            ->assertCreated()
            ->json('data');
        $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/extraction-policy-versions/{$extraction['id']}/publish")
            ->assertOk();

        $model = $this->actingAs($this->admin)
            ->postJson('/api/v1/admin/crawler/onboarding-execution-model-versions', [
                'name' => $name,
                'discovery_policy_version_id' => $discovery['id'],
                'extraction_policy_version_id' => $extraction['id'],
            ])
            ->assertCreated()
            ->assertJsonPath('data.discovery_policy_version_id', $discovery['id'])
            ->assertJsonPath('data.extraction_policy_version_id', $extraction['id'])
            ->json('data');
        $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/onboarding-execution-model-versions/{$model['id']}/publish")
            ->assertOk();

        return $model;
    }

    private function configuredExecution(
        CrawlAgency $agency,
        string $name = 'Default onboarding',
    ): OnboardingExecution {
        $model = $this->createCatalog($name);
        $this->actingAs($this->admin)
            ->putJson("/api/v1/admin/crawler/crawl-agencies/{$agency->id}/onboarding-plan", [
                'name' => $name,
                'conduction' => 'automated',
                'execution_model_version_id' => $model['id'],
            ])
            ->assertOk();
        $id = $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/crawl-agencies/{$agency->id}/onboarding-plan/confirm")
            ->assertCreated()
            ->json('data.id');

        return OnboardingExecution::query()->findOrFail($id);
    }

    private function succeed(CrawlerOperation $operation, array $result): void
    {
        $operation->forceFill([
            'state' => 'succeeded',
            'stage' => 'completed',
            'progress_percentage' => 100,
            'result' => $result,
            'completed_at' => now(),
        ])->save();
    }
}
