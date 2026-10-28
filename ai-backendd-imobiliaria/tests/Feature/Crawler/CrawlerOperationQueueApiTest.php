<?php

namespace Tests\Feature\Crawler;

use App\Models\Crawler\CrawlAgency;
use App\Models\Crawler\CrawlerOperation;
use App\Models\Crawler\WorkerInstance;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class CrawlerOperationQueueApiTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
        $this->admin = User::query()->where('email', 'platform@imobiliaria.com')->firstOrFail();
    }

    public function test_queue_lists_running_operations_and_queued_operations_in_worker_claim_order(): void
    {
        $busy = $this->agency('busy');
        $idle = $this->agency('idle');
        $worker = WorkerInstance::query()->create([
            'worker_key' => 'worker-queue-a',
            'version' => '1.0.0',
            'capacity' => ['concurrency' => 1],
            'health_state' => 'healthy',
            'last_heartbeat_at' => now(),
        ]);
        $running = $this->operation($busy, 'production_crawl', 'running', now()->subMinutes(30), [
            'worker_instance_id' => $worker->id,
            'claimed_at' => now()->subMinutes(20),
            'stage' => 'extraction',
            'progress_percentage' => 40,
        ]);
        $this->operation($idle, 'discovery', 'succeeded', now()->subHour());
        $newest = $this->operation($idle, 'discovery', 'queued', now()->subMinute());
        $oldest = $this->operation($idle, 'prospecting', 'queued', now()->subMinutes(15));
        $blocked = $this->operation($busy, 'production_crawl', 'queued', now()->subMinutes(10));
        $tied = $this->operation($idle, 'production_crawl', 'queued', $blocked->created_at);

        $this->actingAs($this->admin)
            ->getJson('/api/v1/admin/crawler/operation-queue?per_page=3')
            ->assertOk()
            ->assertJsonCount(1, 'running')
            ->assertJsonPath('running.0.id', $running->id)
            ->assertJsonPath('running.0.worker.worker_key', 'worker-queue-a')
            ->assertJsonPath('running.0.progress.percentage', 40)
            ->assertJsonPath('meta.total', 4)
            ->assertJsonPath('meta.last_page', 2)
            ->assertJsonPath('data.0.position', 1)
            ->assertJsonPath('data.0.operation.id', $oldest->id)
            ->assertJsonPath('data.0.blocked_by_operation_id', null)
            ->assertJsonPath('data.1.position', 2)
            ->assertJsonPath('data.1.operation.id', $blocked->id)
            ->assertJsonPath('data.1.operation.crawl_agency.name', 'Queue busy')
            ->assertJsonPath('data.1.blocked_by_operation_id', $running->id)
            ->assertJsonPath('data.2.position', 3)
            ->assertJsonPath('data.2.operation.id', $tied->id)
            ->assertJsonPath('data.2.blocked_by_operation_id', null);

        $this->getJson('/api/v1/admin/crawler/operation-queue?per_page=3&page=2')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.position', 4)
            ->assertJsonPath('data.0.operation.id', $newest->id);
    }

    public function test_queue_requires_crawler_view_permission(): void
    {
        $this->actingAs($this->admin)->getJson('/api/v1/admin/crawler/operation-queue')->assertOk();

        Role::query()->where('name', 'Platform Admin')->firstOrFail()->revokePermissionTo('crawler.view');

        $this->getJson('/api/v1/admin/crawler/operation-queue')->assertForbidden();
    }

    private function agency(string $suffix): CrawlAgency
    {
        return CrawlAgency::query()->create([
            'name' => "Queue {$suffix}",
            'slug' => "queue-{$suffix}",
            'base_url' => "https://{$suffix}.queue.example.com",
            'root_domain' => "{$suffix}.queue.example.com",
            'lifecycle_state' => 'active',
        ]);
    }

    private function operation(CrawlAgency $agency, string $type, string $state, mixed $createdAt, array $overrides = []): CrawlerOperation
    {
        return CrawlerOperation::query()->forceCreate(array_merge([
            'type' => $type,
            'state' => $state,
            'requested_by' => $this->admin->id,
            'crawl_agency_id' => $agency->id,
            'plan' => [],
            'stage' => 'queued',
            'progress_percentage' => 0,
            'completed_at' => in_array($state, ['succeeded', 'failed', 'cancelled'], true) ? now() : null,
            'created_at' => $createdAt,
        ], $overrides));
    }
}
