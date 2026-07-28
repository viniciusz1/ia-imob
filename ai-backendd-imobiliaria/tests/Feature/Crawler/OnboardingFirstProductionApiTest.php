<?php

namespace Tests\Feature\Crawler;

use App\Models\Crawler\CrawlAgency;
use App\Models\Crawler\CrawlerOperation;
use App\Models\Crawler\DiscoveryPolicyVersion;
use App\Models\Crawler\DiscoverySnapshot;
use App\Models\Crawler\DiscoverySnapshotUrl;
use App\Models\Crawler\ExtractionPolicyVersion;
use App\Models\Crawler\ExtractionProfile;
use App\Models\Crawler\MarketDataContractVersion;
use App\Models\Crawler\OnboardingExecution;
use App\Models\Crawler\OnboardingPlan;
use App\Models\Crawler\ProfileValidationReport;
use App\Models\Crawler\Prospect;
use App\Models\Crawler\QualityPolicyVersion;
use App\Models\CrawlerRun;
use App\Models\User;
use App\Services\Crawler\OnboardingExecutionCoordinator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class OnboardingFirstProductionApiTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
        $this->admin = User::query()
            ->where('email', 'platform@imobiliaria.com')
            ->firstOrFail();
    }

    public function test_automated_approval_activates_atomically_and_publishes_first_production(): void
    {
        [$execution, $profile, $snapshot, $discoveryPolicy] = $this->awaitingApproval(
            'automated-published',
            'automated',
        );

        $response = $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/onboarding-executions/{$execution->id}/approve")
            ->assertOk()
            ->assertJsonPath('data.state', 'running')
            ->assertJsonPath('data.current_step', 'first_production')
            ->assertJsonPath('data.first_production_discovery_mode', 'fresh')
            ->assertJsonPath('data.operations.3.type', 'production_crawl')
            ->assertJsonPath('data.operations.3.attempt', 1)
            ->json('data');

        $this->assertSame('active', $profile->refresh()->status);
        $this->assertSame('active', $execution->crawlAgency->refresh()->lifecycle_state);
        $this->assertSame(
            $discoveryPolicy->id,
            $execution->crawlAgency->active_discovery_policy_version_id,
        );
        $production = CrawlerOperation::query()->findOrFail(
            $response['operations'][3]['id'],
        );
        $this->assertSame('fresh', $production->plan['discovery']['requested_mode']);
        $this->assertSame(
            $discoveryPolicy->id,
            $production->plan['discovery_policy']['id'],
        );
        $this->assertSame($profile->id, $production->plan['extraction_profile']['id']);
        $this->assertSame(
            $execution->market_data_contract_version_id,
            $production->plan['market_data_contract']['id'],
        );
        $this->assertNotEmpty($production->plan['quality_policy']['id']);

        $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/onboarding-executions/{$execution->id}/approve")
            ->assertOk();
        $this->assertDatabaseCount('crawler.operations', 4);

        $freshSnapshot = $this->snapshotFor($production, $execution->crawlAgency);
        $run = $this->crawlRun($production, $freshSnapshot, $profile, 1);
        $this->succeed($production, $run);

        $completed = app(OnboardingExecutionCoordinator::class)
            ->reconcile($execution)
            ->refresh();

        $this->assertSame('completed', $completed->state);
        $this->assertSame('quality_gate', $completed->current_step);
        $this->assertSame($run->id, $completed->first_production_crawl_run_id);
        $this->assertSame('published', $run->refresh()->publication_state);
        $this->assertSame(
            $run->id,
            $execution->crawlAgency->refresh()->current_published_crawl_run_id,
        );
        $this->assertSame('completed', $execution->onboardingPlan->refresh()->status);

        $this->actingAs($this->admin)
            ->getJson("/api/v1/admin/crawler/onboarding-executions/{$execution->id}")
            ->assertOk()
            ->assertJsonPath('data.state', 'completed')
            ->assertJsonPath('data.first_production.publication_state', 'published')
            ->assertJsonPath('data.first_production.quality_verdict', 'approved')
            ->assertJsonPath('data.steps.5.state', 'published')
            ->assertJsonPath('data.next_action', null);
    }

    public function test_manual_approval_waits_and_validation_snapshot_can_finish_quarantined(): void
    {
        [$execution, $profile, $snapshot] = $this->awaitingApproval(
            'manual-quarantined',
            'manual',
        );

        $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/onboarding-executions/{$execution->id}/approve")
            ->assertOk()
            ->assertJsonPath('data.state', 'awaiting_first_production')
            ->assertJsonPath('data.next_action', 'start_first_production');
        $this->assertDatabaseCount('crawler.operations', 3);

        $started = $this->actingAs($this->admin)
            ->postJson(
                "/api/v1/admin/crawler/onboarding-executions/{$execution->id}/first-production",
                ['discovery_mode' => 'validation_snapshot'],
            )
            ->assertOk()
            ->assertJsonPath('data.state', 'running')
            ->assertJsonPath('data.first_production_discovery_mode', 'validation_snapshot')
            ->json('data');

        $production = CrawlerOperation::query()->findOrFail(
            collect($started['operations'])
                ->firstWhere('step', 'first_production')['id'],
        );
        $this->assertSame('existing', $production->plan['discovery']['mode']);
        $this->assertSame(
            'validation_snapshot',
            $production->plan['discovery']['requested_mode'],
        );
        $this->assertSame($snapshot->id, $production->plan['discovery']['snapshot_id']);

        $run = $this->crawlRun($production, $snapshot, $profile, 0);
        $this->succeed($production, $run);
        $completed = app(OnboardingExecutionCoordinator::class)
            ->reconcile($execution)
            ->refresh();

        $this->assertSame('completed', $completed->state);
        $this->assertSame('quarantined', $run->refresh()->publication_state);
        $this->assertContains(
            'zero_valid_records',
            $run->qualityReport()->firstOrFail()->blockers,
        );
        $this->assertNull(
            $execution->crawlAgency->refresh()->current_published_crawl_run_id,
        );
    }

    public function test_failed_first_production_is_retryable_without_losing_attempt(): void
    {
        [$execution] = $this->awaitingApproval(
            'automated-retry',
            'automated',
        );
        $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/onboarding-executions/{$execution->id}/approve")
            ->assertOk();
        $first = $execution->operations()
            ->where('onboarding_step', 'first_production')
            ->sole();
        $first->forceFill([
            'state' => 'failed',
            'error_code' => 'partial_crawl',
            'error_message' => 'Browser crashed after partial evidence.',
            'completed_at' => now(),
        ])->save();

        app(OnboardingExecutionCoordinator::class)->reconcile($execution);

        $this->actingAs($this->admin)
            ->getJson("/api/v1/admin/crawler/onboarding-executions/{$execution->id}")
            ->assertOk()
            ->assertJsonPath('data.state', 'requires_attention')
            ->assertJsonPath('data.attention.code', 'first_production_failed')
            ->assertJsonPath('data.next_action', 'retry_first_production');

        $this->actingAs($this->admin)
            ->postJson(
                "/api/v1/admin/crawler/onboarding-executions/{$execution->id}/first-production",
                ['discovery_mode' => 'validation_snapshot'],
            )
            ->assertOk()
            ->assertJsonPath('data.state', 'running');

        $attempts = $execution->operations()
            ->where('onboarding_step', 'first_production')
            ->orderBy('attempt')
            ->get();
        $this->assertCount(2, $attempts);
        $this->assertSame('failed', $attempts[0]->state);
        $this->assertSame(1, $attempts[0]->attempt);
        $this->assertSame('queued', $attempts[1]->state);
        $this->assertSame(2, $attempts[1]->attempt);
        $this->assertSame($attempts[0]->id, $attempts[1]->retry_of_operation_id);
        $this->assertSame(
            'validation_snapshot',
            $attempts[1]->plan['discovery']['requested_mode'],
        );
    }

    public function test_ineligible_approval_requires_reason_and_both_permissions(): void
    {
        [$execution] = $this->awaitingApproval(
            'ineligible',
            'automated',
            false,
        );

        $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/onboarding-executions/{$execution->id}/approve")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('reason');
        $this->assertSame('awaiting_approval', $execution->refresh()->state);

        $partialApprover = User::factory()->create(['agency_id' => null]);
        $partialApprover->givePermissionTo(
            Permission::findByName('crawler.profiles.approve', 'web'),
        );
        $this->actingAs($partialApprover)
            ->postJson(
                "/api/v1/admin/crawler/onboarding-executions/{$execution->id}/approve",
                ['reason' => 'Reviewed exception.'],
            )
            ->assertForbidden();

        $this->actingAs($this->admin)
            ->postJson(
                "/api/v1/admin/crawler/onboarding-executions/{$execution->id}/approve",
                ['reason' => 'Validation evidence reviewed and accepted.'],
            )
            ->assertOk()
            ->assertJsonPath(
                'data.approval.reason',
                'Validation evidence reviewed and accepted.',
            );
    }

    public function test_point_discovery_configuration_is_not_silently_made_active(): void
    {
        [$execution] = $this->awaitingApproval(
            'point-configuration',
            'manual',
        );
        $resolved = $execution->resolved_configuration;
        $resolved['discovery_policy'] = [
            'id' => null,
            'name' => 'Point Configuration',
            'version' => null,
            'source' => 'point_configuration',
            'strategies' => ['sitemap'],
            'sources' => ['sitemap'],
            'configuration' => [],
        ];
        $execution->update([
            'discovery_policy_version_id' => null,
            'resolved_configuration' => $resolved,
        ]);

        $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/onboarding-executions/{$execution->id}/approve")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('discovery_policy_version_id');

        $this->assertSame('awaiting_approval', $execution->refresh()->state);
        $this->assertSame(
            'onboarding',
            $execution->crawlAgency->refresh()->lifecycle_state,
        );
        $this->assertNull(
            $execution->crawlAgency->active_discovery_policy_version_id,
        );
    }

    private function awaitingApproval(
        string $suffix,
        string $conduction,
        bool $eligible = true,
    ): array {
        $contract = MarketDataContractVersion::query()
            ->where('status', 'active')
            ->firstOrFail();
        $agency = CrawlAgency::query()->create([
            'name' => "Onboarding first production {$suffix}",
            'slug' => "onboarding-first-{$suffix}",
            'base_url' => "https://{$suffix}.first.example.com",
            'root_domain' => "{$suffix}.first.example.com",
            'lifecycle_state' => 'onboarding',
        ]);
        $prospect = Prospect::query()->create([
            'root_domain' => "prospect-{$suffix}.example.com",
            'google_place_id' => "first-production-{$suffix}",
            'name' => "First production {$suffix}",
            'city' => 'Joinville',
            'state' => 'SC',
            'base_url' => $agency->base_url,
            'source' => 'test',
            'automatic_classification' => 'candidate',
            'review_state' => 'approved',
            'metadata' => [],
        ]);
        $plan = OnboardingPlan::query()->create([
            'prospect_id' => $prospect->id,
            'crawl_agency_id' => $agency->id,
            'status' => 'in_progress',
            'steps' => [],
            'name' => "First production {$suffix}",
            'conduction' => $conduction,
            'first_production_discovery_mode' => 'fresh',
            'created_by' => $this->admin->id,
        ]);
        $discoveryPolicy = DiscoveryPolicyVersion::query()->create([
            'policy_key' => (string) Str::uuid(),
            'name' => "Discovery {$suffix}",
            'version' => 1,
            'status' => 'available',
            'strategies' => ['sitemap'],
            'configuration' => ['max_urls' => 100],
            'created_by' => $this->admin->id,
        ]);
        $extractionPolicy = ExtractionPolicyVersion::query()->create([
            'policy_key' => (string) Str::uuid(),
            'name' => "Extraction {$suffix}",
            'version' => 1,
            'status' => 'available',
            'strategies' => ['xpath'],
            'configuration' => [],
            'created_by' => $this->admin->id,
        ]);
        $resolvedDiscovery = [
            'id' => $discoveryPolicy->id,
            'name' => $discoveryPolicy->name,
            'version' => $discoveryPolicy->version,
            'source' => 'catalog',
            'strategies' => $discoveryPolicy->strategies,
            'sources' => $discoveryPolicy->strategies,
            'configuration' => $discoveryPolicy->configuration,
        ];
        $resolvedExtraction = [
            'id' => $extractionPolicy->id,
            'name' => $extractionPolicy->name,
            'version' => $extractionPolicy->version,
            'source' => 'catalog',
            'strategies' => $extractionPolicy->strategies,
            'configuration' => $extractionPolicy->configuration,
        ];
        $execution = OnboardingExecution::query()->create([
            'onboarding_plan_id' => $plan->id,
            'crawl_agency_id' => $agency->id,
            'name' => $plan->name,
            'conduction' => $conduction,
            'state' => 'awaiting_approval',
            'current_step' => 'approval',
            'discovery_policy_version_id' => $discoveryPolicy->id,
            'extraction_policy_version_id' => $extractionPolicy->id,
            'market_data_contract_version_id' => $contract->id,
            'resolved_configuration' => [
                'version' => 1,
                'discovery_policy' => $resolvedDiscovery,
                'extraction_policy' => $resolvedExtraction,
                'market_data_contract' => [
                    'id' => $contract->id,
                    'version' => $contract->version,
                    'fields' => $contract->fields,
                ],
            ],
            'first_production_discovery_mode' => 'fresh',
            'created_by' => $this->admin->id,
            'started_at' => now(),
            'paused_at' => now(),
        ]);
        $discovery = $this->operation($execution, 'discovery');
        $snapshot = $this->snapshotFor($discovery, $agency);
        $execution->update(['discovery_snapshot_id' => $snapshot->id]);
        $generation = $this->operation($execution, 'profile_generation');
        $profile = ExtractionProfile::query()->create([
            'crawl_agency_id' => $agency->id,
            'discovery_snapshot_id' => $snapshot->id,
            'market_data_contract_version_id' => $contract->id,
            'created_by_operation_id' => $generation->id,
            'version' => 1,
            'status' => 'candidate',
            'sample_url' => "{$agency->base_url}/property/1",
            'schemas' => ['xpath' => ['baseSelector' => '//body', 'fields' => []]],
            'strategies' => ['xpath'],
            'fields' => $contract->fields,
            'parameters' => ['extraction_policy' => $resolvedExtraction],
        ]);
        $validation = $this->operation($execution, 'profile_validation');
        ProfileValidationReport::query()->create([
            'operation_id' => $validation->id,
            'extraction_profile_id' => $profile->id,
            'sampled_url_count' => 1,
            'valid_record_count' => $eligible ? 1 : 0,
            'valid_ratio' => $eligible ? 1 : 0,
            'required_field_coverage' => ['valor' => $eligible ? 1 : 0],
            'blocking_failures' => $eligible ? [] : ['no_valid_records'],
            'warnings' => [],
            'eligible' => $eligible,
        ]);

        return [
            $execution->refresh(),
            $profile,
            $snapshot,
            $discoveryPolicy,
        ];
    }

    private function operation(
        OnboardingExecution $execution,
        string $step,
    ): CrawlerOperation {
        return CrawlerOperation::query()->create([
            'type' => match ($step) {
                'discovery' => 'discovery',
                'profile_generation' => 'profile_generation',
                'profile_validation' => 'profile_validation',
            },
            'state' => 'succeeded',
            'requested_by' => $this->admin->id,
            'crawl_agency_id' => $execution->crawl_agency_id,
            'market_data_contract_version_id' => $execution->market_data_contract_version_id,
            'plan' => [],
            'onboarding_execution_id' => $execution->id,
            'onboarding_step' => $step,
            'attempt' => 1,
            'completed_at' => now(),
        ]);
    }

    private function snapshotFor(
        CrawlerOperation $operation,
        CrawlAgency $agency,
    ): DiscoverySnapshot {
        $snapshot = DiscoverySnapshot::query()->create([
            'operation_id' => $operation->id,
            'crawl_agency_id' => $agency->id,
            'url_count' => 1,
            'content_hash' => hash('sha256', "snapshot:{$operation->id}"),
        ]);
        DiscoverySnapshotUrl::query()->create([
            'discovery_snapshot_id' => $snapshot->id,
            'url' => "{$agency->base_url}/property/1",
            'url_hash' => hash('sha256', "{$agency->base_url}/property/1"),
        ]);

        return $snapshot;
    }

    private function crawlRun(
        CrawlerOperation $operation,
        DiscoverySnapshot $snapshot,
        ExtractionProfile $profile,
        int $normalizedCount,
    ): CrawlerRun {
        return CrawlerRun::query()->create([
            'operation_id' => $operation->id,
            'crawl_agency_id' => $operation->crawl_agency_id,
            'discovery_snapshot_id' => $snapshot->id,
            'extraction_profile_id' => $profile->id,
            'market_data_contract_version_id' => $profile->market_data_contract_version_id,
            'quality_policy_version_id' => QualityPolicyVersion::query()
                ->where('status', 'active')
                ->firstOrFail()
                ->id,
            'technical_state' => 'succeeded',
            'result_kind' => 'full',
            'publication_state' => 'candidate',
            'publishable' => $normalizedCount > 0,
            'raw_count' => $normalizedCount,
            'normalized_count' => $normalizedCount,
            'rejected_count' => 0,
            'error_count' => 0,
            'completed_at' => now(),
        ]);
    }

    private function succeed(
        CrawlerOperation $operation,
        CrawlerRun $run,
    ): void {
        $operation->forceFill([
            'state' => 'succeeded',
            'result' => [
                'crawl_run_id' => $run->id,
                'discovery_snapshot_id' => $run->discovery_snapshot_id,
                'publication_state' => 'candidate',
            ],
            'completed_at' => now(),
        ])->save();
    }
}
