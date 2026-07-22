<?php

namespace Tests\Feature\Crawler;

use App\Models\Crawler\CrawlAgency;
use App\Models\Crawler\CrawlerOperation;
use App\Models\Crawler\DiscoverySnapshot;
use App\Models\Crawler\WorkerInstance;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DiscoveryOperationApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_operator_queues_an_immutable_discovery_plan_and_reads_progress(): void
    {
        $this->seed();
        $admin = User::query()->where('email', 'platform@imobiliaria.com')->firstOrFail();

        $agency = $this->actingAs($admin)->postJson('/api/v1/admin/crawler/crawl-agencies', [
            'name' => 'Discovery Source',
            'slug' => 'discovery-source',
            'base_url' => 'https://discovery.example.com/imoveis',
            'root_domain' => 'discovery.example.com',
        ])->assertCreated()->json('data');

        $contract = $this->actingAs($admin)->postJson('/api/v1/admin/crawler/market-data-contracts', [
            'fields' => [
                ['name' => 'title', 'type' => 'string', 'required' => true, 'normalization' => ['trim']],
            ],
        ])->assertCreated()->json('data');
        $this->actingAs($admin)->postJson("/api/v1/admin/crawler/market-data-contracts/{$contract['id']}/validate")->assertOk();
        $this->actingAs($admin)->postJson("/api/v1/admin/crawler/market-data-contracts/{$contract['id']}/activate")->assertOk();

        $operation = $this->actingAs($admin)
            ->postJson('/api/v1/admin/crawler/operations', [
                'type' => 'discovery',
                'crawl_agency_id' => $agency['id'],
                'market_data_contract_version_id' => $contract['id'],
            ])
            ->assertCreated()
            ->assertJsonPath('data.state', 'queued')
            ->assertJsonPath('data.progress.percentage', 0)
            ->assertJsonPath('data.plan.base_url', 'https://discovery.example.com/imoveis')
            ->json('data');

        $this->actingAs($admin)
            ->getJson('/api/v1/admin/crawler/operations/'.$operation['id'])
            ->assertOk()
            ->assertJsonPath('data.id', $operation['id'])
            ->assertJsonMissingPath('data.plan.database_password');
    }

    public function test_operator_preserves_the_selected_domain_mapper_policy_in_the_discovery_plan(): void
    {
        $this->seed();
        $admin = User::query()->where('email', 'platform@imobiliaria.com')->firstOrFail();
        $agency = CrawlAgency::query()->create([
            'name' => 'Policy Source', 'slug' => 'policy-source',
            'base_url' => 'https://policy.example.com', 'root_domain' => 'policy.example.com',
        ]);
        $contract = \App\Models\Crawler\MarketDataContractVersion::query()->where('status', 'active')->sole();

        $this->actingAs($admin)->postJson('/api/v1/admin/crawler/operations', [
            'type' => 'discovery', 'crawl_agency_id' => $agency->id,
            'market_data_contract_version_id' => $contract->id,
            'discovery_policy' => [
                'sources' => ['sitemap', 'robots', 'homepage'],
                'max_urls' => 250,
                'include_subdomains' => false,
                'use_browser_for_homepage' => true,
                'query' => 'apartamentos',
                'probe_paths' => ['/imoveis'],
            ],
        ])->assertCreated()
            ->assertJsonPath('data.plan.discovery_policy.sources', ['sitemap', 'robots', 'homepage'])
            ->assertJsonPath('data.plan.discovery_policy.max_urls', 250)
            ->assertJsonPath('data.plan.discovery_policy.include_subdomains', false)
            ->assertJsonPath('data.plan.discovery_policy.use_browser_for_homepage', true);
    }

    public function test_operator_reads_paginated_snapshot_urls_and_sanitized_worker_health(): void
    {
        $this->seed();
        $admin = User::query()->where('email', 'platform@imobiliaria.com')->firstOrFail();
        $agency = CrawlAgency::query()->create([
            'name' => 'Worker Source',
            'slug' => 'worker-source',
            'base_url' => 'https://worker.example.com',
            'root_domain' => 'worker.example.com',
        ]);
        $operation = CrawlerOperation::query()->create([
            'type' => 'discovery',
            'state' => 'succeeded',
            'requested_by' => $admin->id,
            'crawl_agency_id' => $agency->id,
            'plan' => ['base_url' => $agency->base_url],
        ]);
        $snapshot = DiscoverySnapshot::query()->create([
            'operation_id' => $operation->id,
            'crawl_agency_id' => $agency->id,
            'url_count' => 2,
            'content_hash' => str_repeat('a', 64),
        ]);
        $snapshot->urls()->createMany([
            ['url' => 'https://worker.example.com/imovel/1', 'url_hash' => str_repeat('1', 64)],
            ['url' => 'https://worker.example.com/imovel/2', 'url_hash' => str_repeat('2', 64)],
        ]);
        WorkerInstance::query()->create([
            'worker_key' => 'worker-prod-a',
            'version' => '1.0.0',
            'capacity' => ['concurrency' => 1],
            'health_state' => 'healthy',
            'last_heartbeat_at' => now(),
        ]);

        $this->actingAs($admin)
            ->getJson("/api/v1/admin/crawler/discovery-snapshots/{$snapshot->id}/urls?per_page=1&page=2")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.url', 'https://worker.example.com/imovel/2')
            ->assertJsonPath('meta.total', 2);

        $this->actingAs($admin)
            ->getJson('/api/v1/admin/crawler/workers')
            ->assertOk()
            ->assertJsonPath('data.0.worker_key', 'worker-prod-a')
            ->assertJsonMissingPath('data.0.database_password');
    }
}
