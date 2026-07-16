<?php

namespace Tests\Feature\Crawler;

use App\Models\Crawler\CrawlAgency;
use App\Models\Crawler\CrawlAgencyCircuit;
use App\Models\Crawler\CrawlerOperation;
use App\Models\Crawler\OperationGroup;
use App\Models\CrawlerRun;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CrawlerObservabilityApiTest extends TestCase
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
            'name' => 'Observable Homes',
            'slug' => 'observable-homes',
            'base_url' => 'https://observable.example.com',
            'root_domain' => 'observable.example.com',
            'lifecycle_state' => 'active',
            'health_state' => 'degraded',
        ]);
    }

    public function test_overview_summarizes_actionable_state_and_contextual_links(): void
    {
        $running = $this->operation('discovery', 'running');
        $failed = $this->operation('production_crawl', 'failed', ['equivalence_key' => str_repeat('a', 64)]);
        CrawlAgencyCircuit::query()->create([
            'crawl_agency_id' => $this->agency->id,
            'state' => 'open',
            'consecutive_failures' => 3,
            'reason' => 'three_consecutive_production_failures',
        ]);
        $runOperation = $this->operation('production_crawl', 'succeeded');
        $run = CrawlerRun::query()->create([
            'operation_id' => $runOperation->id,
            'crawl_agency_id' => $this->agency->id,
            'technical_state' => 'succeeded',
            'result_kind' => 'full',
            'publication_state' => 'quarantined',
            'quarantined_at' => now(),
        ]);

        $response = $this->actingAs($this->admin)->getJson('/api/v1/admin/crawler/overview')->assertOk();

        $response->assertJsonPath('data.agencies.lifecycle.active', 1)
            ->assertJsonPath('data.agencies.health.degraded', 1)
            ->assertJsonPath('data.operations.active', 1)
            ->assertJsonPath('data.operations.failed', 1)
            ->assertJsonPath('data.open_circuits', 1)
            ->assertJsonPath('data.quarantined_snapshots', 1)
            ->assertJsonFragment(['href' => "/admin/crawler/agencies/{$this->agency->id}"])
            ->assertJsonFragment(['href' => '/admin/crawler/operations?state=failed'])
            ->assertJsonFragment(['href' => "/admin/crawler/runs/{$run->id}"]);
        $this->assertNotEmpty($response->json('data.alerts'));
        $this->assertSame($running->id, $response->json('data.active_operations.0.id'));
        $this->assertSame($failed->id, $response->json('data.recent_failures.0.id'));
    }

    public function test_global_queue_filters_and_exposes_canonical_timeline_without_hiding_equivalent_failures(): void
    {
        $requester = User::factory()->create();
        $target = $this->operation('production_crawl', 'failed', [
            'requested_by' => $requester->id,
            'equivalence_key' => str_repeat('b', 64),
            'stage' => 'quality',
            'created_at' => now()->subHour(),
        ]);
        $equivalent = $this->operation('production_crawl', 'failed', [
            'equivalence_key' => str_repeat('b', 64),
        ]);
        $this->operation('discovery', 'succeeded', ['created_at' => now()->subDays(10)]);
        $group = OperationGroup::query()->create([
            'name' => 'Production failures',
            'action' => 'aggregate',
            'requested_by' => $this->admin->id,
        ]);
        $group->operations()->attach($target->id);

        $response = $this->actingAs($this->admin)->getJson('/api/v1/admin/crawler/operations?'.http_build_query([
            'type' => 'production_crawl',
            'state' => 'failed',
            'crawl_agency_id' => $this->agency->id,
            'group_id' => $group->id,
            'requested_by' => $requester->id,
            'from' => now()->subDay()->toIso8601String(),
            'to' => now()->toIso8601String(),
        ]))->assertOk()->assertJsonCount(1, 'data');

        $response->assertJsonPath('data.0.id', $target->id)
            ->assertJsonPath('data.0.requester.id', $requester->id)
            ->assertJsonPath('data.0.groups.0.id', $group->id)
            ->assertJsonPath('data.0.equivalent_failure_count', 2)
            ->assertJsonPath('data.0.timeline.0.stage', 'queue')
            ->assertJsonFragment(['stage' => 'quality']);
        $this->assertDatabaseHas('crawler.operations', ['id' => $equivalent->id]);
    }

    public function test_integrations_expose_only_sanitized_configuration_state(): void
    {
        config([
            'crawler.integrations.google_places.credential' => 'places-secret-123456',
            'crawler.integrations.deepseek.credential' => 'deepseek-secret-abcdef',
        ]);

        $index = $this->actingAs($this->admin)->getJson('/api/v1/admin/crawler/integrations')->assertOk()
            ->assertJsonFragment(['key' => 'google_places', 'availability' => 'configured', 'credential_identifier' => '…3456'])
            ->assertJsonFragment(['key' => 'deepseek', 'availability' => 'configured', 'credential_identifier' => '…cdef']);
        $test = $this->actingAs($this->admin)->postJson('/api/v1/admin/crawler/integrations/google_places/test')->assertOk()
            ->assertJsonPath('data.status', 'configuration_valid')
            ->assertJsonMissing(['credential' => 'places-secret-123456']);

        $this->assertStringNotContainsString('places-secret-123456', $index->getContent());
        $this->assertStringNotContainsString('deepseek-secret-abcdef', $index->getContent());
        $this->assertStringNotContainsString('places-secret-123456', $test->getContent());
    }

    private function operation(string $type, string $state, array $overrides = []): CrawlerOperation
    {
        return CrawlerOperation::query()->forceCreate(array_merge([
            'type' => $type,
            'state' => $state,
            'requested_by' => $this->admin->id,
            'crawl_agency_id' => $this->agency->id,
            'plan' => [],
            'stage' => $state === 'running' ? 'discovery' : 'queued',
            'progress_percentage' => $state === 'succeeded' ? 100 : 0,
            'completed_at' => in_array($state, ['succeeded', 'failed', 'cancelled'], true) ? now() : null,
        ], $overrides));
    }
}
