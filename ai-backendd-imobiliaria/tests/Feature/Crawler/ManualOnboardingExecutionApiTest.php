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
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ManualOnboardingExecutionApiTest extends TestCase
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

    public function test_manual_plan_freezes_catalog_and_point_configuration_without_a_model(): void
    {
        [$agency, $plan] = $this->promoteProspect('freeze');
        [$discovery] = $this->createPublishedPolicies('Manual freeze');

        $this->actingAs($this->admin)
            ->putJson("/api/v1/admin/crawler/crawl-agencies/{$agency->id}/onboarding-plan", [
                'name' => 'Onboarding manual Joinville',
                'conduction' => 'manual',
                'manual_configuration' => [
                    'discovery' => [
                        'mode' => 'fresh',
                        'policy_version_id' => $discovery['id'],
                    ],
                    'extraction' => [
                        'point_configuration' => [
                            'strategies' => ['xpath', 'css'],
                            'configuration' => [],
                        ],
                    ],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('data.conduction', 'manual')
            ->assertJsonPath('data.execution_model_version_id', null);

        $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/crawl-agencies/{$agency->id}/onboarding-plan/save-inline-policy", [
                'kind' => 'extraction',
                'name' => 'Extração salva sem confirmação',
                'confirmed' => false,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('confirmed');

        $saved = $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/crawl-agencies/{$agency->id}/onboarding-plan/save-inline-policy", [
                'kind' => 'extraction',
                'name' => 'Extração manual reutilizável',
                'confirmed' => true,
            ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'available')
            ->assertJsonPath('data.strategies.0', 'xpath')
            ->json('data');

        $this->assertNotNull($saved['id']);
        $this->assertNotNull($plan->refresh()->manual_configuration['extraction']['point_configuration']);

        $execution = $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/crawl-agencies/{$agency->id}/onboarding-plan/confirm")
            ->assertCreated()
            ->assertJsonPath('data.conduction', 'manual')
            ->assertJsonPath('data.state', 'awaiting_manual_step')
            ->assertJsonPath('data.current_step', 'discovery')
            ->assertJsonPath('data.next_action', 'run_discovery')
            ->assertJsonPath('data.execution_model_version_id', null)
            ->assertJsonPath('data.discovery_policy_version_id', $discovery['id'])
            ->assertJsonPath('data.extraction_policy_version_id', null)
            ->assertJsonPath('data.resolved_configuration.discovery_policy.source', 'catalog')
            ->assertJsonPath('data.resolved_configuration.extraction_policy.source', 'point_configuration')
            ->assertJsonCount(0, 'data.operations')
            ->json('data');

        $this->actingAs($this->admin)
            ->putJson("/api/v1/admin/crawler/crawl-agencies/{$agency->id}/onboarding-plan", [
                'name' => 'Troca proibida',
                'conduction' => 'manual',
                'manual_configuration' => [
                    'discovery' => [
                        'mode' => 'fresh',
                        'point_configuration' => ['strategies' => ['robots']],
                    ],
                    'extraction' => [
                        'point_configuration' => ['strategies' => ['xpath']],
                    ],
                ],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('status');

        $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/onboarding-executions/{$execution['id']}/actions", [
                'action' => 'run_profile_generation',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('action');

        $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/onboarding-executions/{$execution['id']}/actions", [
                'action' => 'run_discovery',
            ])
            ->assertOk();
        $executionModel = OnboardingExecution::query()->findOrFail($execution['id']);
        $discoveryOperation = $executionModel->operations()->sole();
        $snapshot = $this->snapshotFor(
            $discoveryOperation,
            $agency,
            ["{$agency->base_url}/imovel/preservado"],
        );
        $this->succeed($discoveryOperation, ['discovery_snapshot_id' => $snapshot->id]);
        app(OnboardingExecutionCoordinator::class)->reconcile($executionModel);

        $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/onboarding-executions/{$execution['id']}/cancel")
            ->assertOk()
            ->assertJsonPath('data.state', 'cancelled');

        $this->assertSame('draft', $plan->refresh()->status);
        $this->assertDatabaseHas('crawler.onboarding_executions', [
            'id' => $execution['id'],
            'state' => 'cancelled',
        ]);
        $this->assertDatabaseHas('crawler.operations', ['id' => $discoveryOperation->id]);
        $this->assertDatabaseHas('crawler.discovery_snapshots', ['id' => $snapshot->id]);
    }

    public function test_manual_execution_pauses_after_each_healthy_step_and_reaches_approval(): void
    {
        [$agency] = $this->promoteProspect('healthy');
        $execution = $this->confirmInlineManualPlan($agency, 'Healthy manual');
        $coordinator = app(OnboardingExecutionCoordinator::class);

        $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/onboarding-executions/{$execution->id}/actions", [
                'action' => 'run_discovery',
            ])
            ->assertOk()
            ->assertJsonPath('data.state', 'running')
            ->assertJsonPath('data.next_action', 'wait_for_current_operation')
            ->assertJsonCount(1, 'data.operations');

        $discovery = $execution->operations()->where('onboarding_step', 'discovery')->sole();
        $snapshot = $this->snapshotFor(
            $discovery,
            $agency,
            ["{$agency->base_url}/imovel/sugerido"],
        );
        $this->succeed($discovery, ['discovery_snapshot_id' => $snapshot->id]);

        $execution = $coordinator->reconcile($execution);
        $this->assertSame('awaiting_manual_step', $execution->state);
        $this->assertSame('sample_url_confirmation', $execution->current_step);
        $this->assertSame('confirm_sample_url', $this->executionJson($execution->id)['next_action']);
        $this->assertDatabaseCount('crawler.operations', 1);

        $editedUrl = "{$agency->base_url}/imovel/editado";
        $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/onboarding-executions/{$execution->id}/actions", [
                'action' => 'confirm_sample_url',
                'sample_url' => $editedUrl,
            ])
            ->assertOk()
            ->assertJsonPath('data.state', 'awaiting_manual_step')
            ->assertJsonPath('data.current_step', 'profile_generation')
            ->assertJsonPath('data.next_action', 'run_profile_generation')
            ->assertJsonPath('data.sample_url', $editedUrl);

        $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/onboarding-executions/{$execution->id}/actions", [
                'action' => 'run_profile_generation',
            ])
            ->assertOk()
            ->assertJsonPath('data.state', 'running');

        $generation = $execution->operations()
            ->where('onboarding_step', 'profile_generation')
            ->sole();
        $this->assertSame('manual_onboarding_operator', $generation->plan['sample_url_confirmation_source']);
        $this->assertSame(
            $execution->refresh()->resolved_configuration['extraction_policy'],
            $generation->plan['extraction_policy'],
        );
        $profile = $this->profileFor($generation, $snapshot, $execution);
        $this->succeed($generation, ['extraction_profile_id' => $profile->id]);

        $execution = $coordinator->reconcile($execution);
        $this->assertSame('awaiting_manual_step', $execution->state);
        $this->assertSame('profile_validation', $execution->current_step);
        $this->assertDatabaseCount('crawler.operations', 2);

        $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/onboarding-executions/{$execution->id}/actions", [
                'action' => 'run_profile_validation',
            ])
            ->assertOk()
            ->assertJsonPath('data.state', 'running');

        $validation = $execution->operations()
            ->where('onboarding_step', 'profile_validation')
            ->sole();
        ProfileValidationReport::query()->create([
            'operation_id' => $validation->id,
            'extraction_profile_id' => $profile->id,
            'sampled_url_count' => 1,
            'valid_record_count' => 1,
            'valid_ratio' => 1,
            'required_field_coverage' => ['title' => 1],
            'blocking_failures' => [],
            'warnings' => [],
            'eligible' => true,
        ]);
        $this->succeed($validation, ['profile_validation_report_id' => 1]);

        $execution = $coordinator->reconcile($execution);
        $this->assertSame('awaiting_approval', $execution->state);
        $this->assertSame('approval', $execution->current_step);
        $this->assertSame('decide_onboarding', $this->executionJson($execution->id)['next_action']);
        $this->assertDatabaseCount('crawler.operations', 3);
    }

    public function test_rejected_validation_can_correct_url_and_preserves_previous_attempts(): void
    {
        [$agency] = $this->promoteProspect('correction');
        $execution = $this->confirmInlineManualPlan($agency, 'Correction manual');
        [$snapshot, $profile, $validation] = $this->advanceToRunningValidation(
            $agency,
            $execution,
        );
        ProfileValidationReport::query()->create([
            'operation_id' => $validation->id,
            'extraction_profile_id' => $profile->id,
            'sampled_url_count' => 1,
            'valid_record_count' => 0,
            'valid_ratio' => 0,
            'required_field_coverage' => ['title' => 0],
            'blocking_failures' => ['low_valid_ratio'],
            'warnings' => [],
            'eligible' => false,
        ]);
        $this->succeed($validation, ['profile_validation_report_id' => 1]);

        $execution = app(OnboardingExecutionCoordinator::class)->reconcile($execution);
        $this->assertSame('awaiting_manual_step', $execution->state);
        $this->assertSame('sample_url_confirmation', $execution->current_step);
        $this->assertSame('validation_rejected', $execution->attention_code);
        $this->assertSame('correct_sample_url', $this->executionJson($execution->id)['next_action']);

        $corrected = "{$agency->base_url}/imovel/corrigido";
        $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/onboarding-executions/{$execution->id}/actions", [
                'action' => 'correct_sample_url',
                'sample_url' => $corrected,
            ])
            ->assertOk()
            ->assertJsonPath('data.next_action', 'run_profile_generation');

        $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/onboarding-executions/{$execution->id}/actions", [
                'action' => 'run_profile_generation',
            ])
            ->assertOk();

        $generations = $execution->operations()
            ->where('onboarding_step', 'profile_generation')
            ->orderBy('attempt')
            ->get();
        $this->assertCount(2, $generations);
        $this->assertSame(1, $generations[0]->attempt);
        $this->assertSame(2, $generations[1]->attempt);
        $this->assertSame($corrected, $generations[1]->plan['sample_url']);
        $this->assertDatabaseHas('crawler.discovery_snapshots', ['id' => $snapshot->id]);
        $this->assertDatabaseHas('crawler.extraction_profiles', ['id' => $profile->id]);
        $this->assertDatabaseHas('crawler.profile_validation_reports', ['operation_id' => $validation->id]);
    }

    public function test_failed_step_retry_stays_linked_and_existing_snapshot_must_match_agency(): void
    {
        [$agency] = $this->promoteProspect('retry');
        [$otherAgency] = $this->promoteProspect('other');
        $foreignOperation = CrawlerOperation::query()->create([
            'type' => 'discovery',
            'state' => 'succeeded',
            'requested_by' => $this->admin->id,
            'crawl_agency_id' => $otherAgency->id,
            'plan' => [],
        ]);
        $foreignSnapshot = $this->snapshotFor(
            $foreignOperation,
            $otherAgency,
            ["{$otherAgency->base_url}/imovel/1"],
        );

        $this->actingAs($this->admin)
            ->putJson("/api/v1/admin/crawler/crawl-agencies/{$agency->id}/onboarding-plan", [
                'name' => 'Snapshot estrangeiro',
                'conduction' => 'manual',
                'manual_configuration' => [
                    'discovery' => [
                        'mode' => 'existing',
                        'discovery_snapshot_id' => $foreignSnapshot->id,
                        'point_configuration' => ['strategies' => ['sitemap']],
                    ],
                    'extraction' => [
                        'point_configuration' => ['strategies' => ['xpath']],
                    ],
                ],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('manual_configuration.discovery.discovery_snapshot_id');

        $execution = $this->confirmInlineManualPlan($agency, 'Retry manual');
        $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/onboarding-executions/{$execution->id}/actions", [
                'action' => 'run_discovery',
            ])
            ->assertOk();
        $failed = $execution->operations()->sole();
        $failed->forceFill([
            'state' => 'failed',
            'error_code' => 'adapter_failed',
            'error_message' => 'Deterministic failure.',
            'completed_at' => now(),
        ])->save();

        $execution = app(OnboardingExecutionCoordinator::class)->reconcile($execution);
        $this->assertSame('requires_attention', $execution->state);
        $this->assertSame('retry_failed_operation', $this->executionJson($execution->id)['next_action']);

        $retry = $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/operations/{$failed->id}/retry")
            ->assertCreated()
            ->assertJsonPath('data.retry_of_operation_id', $failed->id)
            ->json('data');

        $this->assertDatabaseHas('crawler.operations', [
            'id' => $retry['id'],
            'onboarding_execution_id' => $execution->id,
            'onboarding_step' => 'discovery',
            'attempt' => 2,
            'retry_of_operation_id' => $failed->id,
        ]);
        $this->assertSame('running', $execution->refresh()->state);
    }

    public function test_manual_plan_can_reuse_an_existing_snapshot_without_new_discovery(): void
    {
        [$agency] = $this->promoteProspect('reuse');
        $operation = CrawlerOperation::query()->create([
            'type' => 'discovery',
            'state' => 'succeeded',
            'requested_by' => $this->admin->id,
            'crawl_agency_id' => $agency->id,
            'plan' => [],
        ]);
        $snapshot = $this->snapshotFor(
            $operation,
            $agency,
            ["{$agency->base_url}/imovel/reutilizado"],
        );

        $this->actingAs($this->admin)
            ->putJson("/api/v1/admin/crawler/crawl-agencies/{$agency->id}/onboarding-plan", [
                'name' => 'Reusar snapshot',
                'conduction' => 'manual',
                'manual_configuration' => [
                    'discovery' => [
                        'mode' => 'existing',
                        'discovery_snapshot_id' => $snapshot->id,
                        'point_configuration' => ['strategies' => ['sitemap']],
                    ],
                    'extraction' => [
                        'point_configuration' => ['strategies' => ['xpath']],
                    ],
                ],
            ])
            ->assertOk();

        $execution = $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/crawl-agencies/{$agency->id}/onboarding-plan/confirm")
            ->assertCreated()
            ->assertJsonPath('data.state', 'awaiting_manual_step')
            ->assertJsonPath('data.current_step', 'sample_url_confirmation')
            ->assertJsonPath('data.next_action', 'confirm_sample_url')
            ->assertJsonPath('data.discovery_snapshot_id', $snapshot->id)
            ->assertJsonPath('data.sample_url', "{$agency->base_url}/imovel/reutilizado")
            ->assertJsonCount(0, 'data.operations')
            ->json('data');

        $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/onboarding-executions/{$execution['id']}/actions", [
                'action' => 'confirm_sample_url',
                'sample_url' => "{$agency->base_url}/imovel/reutilizado",
            ])
            ->assertOk()
            ->assertJsonPath('data.next_action', 'run_profile_generation');
    }

    public function test_manual_execution_adopts_an_independent_discovery_and_pauses_for_sample_confirmation(): void
    {
        [$agency] = $this->promoteProspect('adopt');
        $execution = $this->confirmInlineManualPlan($agency, 'Adoption manual');
        $coordinator = app(OnboardingExecutionCoordinator::class);

        $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/onboarding-executions/{$execution->id}/actions", [
                'action' => 'run_discovery',
            ])
            ->assertOk();
        $failed = $execution->operations()->sole();
        $failed->forceFill([
            'state' => 'failed',
            'error_code' => 'discovery_failed',
            'error_message' => 'O Discovery configurado falhou.',
            'completed_at' => now(),
        ])->save();
        $coordinator->reconcile($execution);

        $sourceOperation = CrawlerOperation::query()->create([
            'type' => 'discovery',
            'state' => 'succeeded',
            'requested_by' => $this->admin->id,
            'crawl_agency_id' => $agency->id,
            'plan' => ['discovery_policy' => ['strategies' => ['sitemap']]],
            'completed_at' => now(),
        ]);
        $snapshot = $this->snapshotFor(
            $sourceOperation,
            $agency,
            ["{$agency->base_url}/imovel/adotado"],
        );

        $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/onboarding-executions/{$execution->id}/adopt-discovery-snapshot", [
                'discovery_snapshot_id' => $snapshot->id,
            ])
            ->assertOk()
            ->assertJsonPath('data.state', 'awaiting_manual_step')
            ->assertJsonPath('data.current_step', 'sample_url_confirmation')
            ->assertJsonPath('data.next_action', 'confirm_sample_url')
            ->assertJsonPath('data.sample_url', "{$agency->base_url}/imovel/adotado")
            ->assertJsonPath('data.discovery_adoption.discovery_snapshot_id', $snapshot->id);

        $this->assertDatabaseMissing('crawler.operations', [
            'onboarding_execution_id' => $execution->id,
            'onboarding_step' => 'profile_generation',
        ]);
        $this->assertSame('failed', $failed->refresh()->state);
        $this->assertNull($sourceOperation->refresh()->onboarding_execution_id);
    }

    private function confirmInlineManualPlan(
        CrawlAgency $agency,
        string $name,
    ): OnboardingExecution {
        $this->actingAs($this->admin)
            ->putJson("/api/v1/admin/crawler/crawl-agencies/{$agency->id}/onboarding-plan", [
                'name' => $name,
                'conduction' => 'manual',
                'manual_configuration' => [
                    'discovery' => [
                        'mode' => 'fresh',
                        'point_configuration' => [
                            'strategies' => ['sitemap', 'homepage'],
                            'configuration' => ['max_urls' => 500],
                        ],
                    ],
                    'extraction' => [
                        'point_configuration' => [
                            'strategies' => ['xpath', 'css'],
                            'configuration' => [],
                        ],
                    ],
                ],
            ])
            ->assertOk();

        $id = $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/crawl-agencies/{$agency->id}/onboarding-plan/confirm")
            ->assertCreated()
            ->json('data.id');

        return OnboardingExecution::query()->findOrFail($id);
    }

    private function advanceToRunningValidation(
        CrawlAgency $agency,
        OnboardingExecution $execution,
    ): array {
        $coordinator = app(OnboardingExecutionCoordinator::class);
        $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/onboarding-executions/{$execution->id}/actions", [
                'action' => 'run_discovery',
            ])
            ->assertOk();
        $discovery = $execution->operations()->where('onboarding_step', 'discovery')->sole();
        $snapshot = $this->snapshotFor(
            $discovery,
            $agency,
            ["{$agency->base_url}/imovel/original"],
        );
        $this->succeed($discovery, ['discovery_snapshot_id' => $snapshot->id]);
        $execution = $coordinator->reconcile($execution);

        $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/onboarding-executions/{$execution->id}/actions", [
                'action' => 'confirm_sample_url',
                'sample_url' => "{$agency->base_url}/imovel/original",
            ])
            ->assertOk();
        $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/onboarding-executions/{$execution->id}/actions", [
                'action' => 'run_profile_generation',
            ])
            ->assertOk();
        $generation = $execution->operations()
            ->where('onboarding_step', 'profile_generation')
            ->sole();
        $profile = $this->profileFor($generation, $snapshot, $execution);
        $this->succeed($generation, ['extraction_profile_id' => $profile->id]);
        $execution = $coordinator->reconcile($execution);

        $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/onboarding-executions/{$execution->id}/actions", [
                'action' => 'run_profile_validation',
            ])
            ->assertOk();
        $validation = $execution->operations()
            ->where('onboarding_step', 'profile_validation')
            ->sole();

        return [$snapshot, $profile, $validation];
    }

    private function promoteProspect(string $suffix): array
    {
        $prospect = Prospect::query()->create([
            'root_domain' => "manual-{$suffix}.example.com",
            'google_place_id' => "manual-{$suffix}",
            'name' => "Manual {$suffix}",
            'city' => 'Joinville',
            'state' => 'SC',
            'base_url' => "https://manual-{$suffix}.example.com",
            'source' => 'google_places',
            'automatic_classification' => 'candidate',
            'review_state' => 'approved',
            'reviewed_by' => $this->admin->id,
            'reviewed_at' => now(),
            'review_reason' => 'Approved.',
            'metadata' => [],
        ]);
        $response = $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/prospects/{$prospect->id}/promote")
            ->assertCreated();
        $agency = CrawlAgency::query()->findOrFail($response->json('data.crawl_agency.id'));
        $plan = OnboardingPlan::query()->where('crawl_agency_id', $agency->id)->sole();

        return [$agency, $plan];
    }

    private function createPublishedPolicies(string $name): array
    {
        $discovery = $this->actingAs($this->admin)
            ->postJson('/api/v1/admin/crawler/discovery-policy-versions', [
                'name' => "{$name} discovery",
                'strategies' => ['sitemap'],
            ])
            ->assertCreated()
            ->json('data');
        $extraction = $this->actingAs($this->admin)
            ->postJson('/api/v1/admin/crawler/extraction-policy-versions', [
                'name' => "{$name} extraction",
                'strategies' => ['xpath'],
            ])
            ->assertCreated()
            ->json('data');
        $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/discovery-policy-versions/{$discovery['id']}/publish")
            ->assertOk();
        $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/extraction-policy-versions/{$extraction['id']}/publish")
            ->assertOk();

        return [$discovery, $extraction];
    }

    private function snapshotFor(
        CrawlerOperation $operation,
        CrawlAgency $agency,
        array $urls,
    ): DiscoverySnapshot {
        $snapshot = DiscoverySnapshot::query()->create([
            'operation_id' => $operation->id,
            'crawl_agency_id' => $agency->id,
            'url_count' => count($urls),
            'content_hash' => hash('sha256', implode('|', $urls)),
        ]);
        foreach ($urls as $url) {
            DiscoverySnapshotUrl::query()->create([
                'discovery_snapshot_id' => $snapshot->id,
                'url' => $url,
                'url_hash' => hash('sha256', $url),
            ]);
        }

        return $snapshot;
    }

    private function profileFor(
        CrawlerOperation $operation,
        DiscoverySnapshot $snapshot,
        OnboardingExecution $execution,
    ): ExtractionProfile {
        return ExtractionProfile::query()->create([
            'crawl_agency_id' => $execution->crawl_agency_id,
            'discovery_snapshot_id' => $snapshot->id,
            'market_data_contract_version_id' => $execution->market_data_contract_version_id,
            'created_by_operation_id' => $operation->id,
            'version' => $operation->attempt,
            'status' => 'candidate',
            'sample_url' => $operation->plan['sample_url'],
            'schemas' => ['xpath' => ['baseSelector' => '//body', 'fields' => []]],
            'strategies' => ['xpath'],
            'fields' => $execution->resolved_configuration['market_data_contract']['fields'],
            'parameters' => [],
        ]);
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

    private function executionJson(int $executionId): array
    {
        return $this->actingAs($this->admin)
            ->getJson("/api/v1/admin/crawler/onboarding-executions/{$executionId}")
            ->assertOk()
            ->json('data');
    }
}
