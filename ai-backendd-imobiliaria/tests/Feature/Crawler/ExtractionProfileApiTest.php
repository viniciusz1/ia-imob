<?php

namespace Tests\Feature\Crawler;

use App\Models\Crawler\CrawlAgency;
use App\Models\Crawler\CrawlerOperation;
use App\Models\Crawler\DiscoverySnapshot;
use App\Models\Crawler\MarketDataContractVersion;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExtractionProfileApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_operator_queues_home_only_sample_url_suggestion(): void
    {
        $this->seed();
        $admin = User::query()->where('email', 'platform@imobiliaria.com')->firstOrFail();
        $agency = CrawlAgency::query()->create([
            'name' => 'Home Suggestion Source',
            'slug' => 'home-suggestion-source',
            'base_url' => 'https://suggestion.example.com',
            'root_domain' => 'suggestion.example.com',
        ]);

        $this->actingAs($admin)
            ->postJson("/api/v1/admin/crawler/crawl-agencies/{$agency->id}/sample-url-suggestion")
            ->assertCreated()
            ->assertJsonPath('data.type', 'sample_url_suggestion')
            ->assertJsonPath('data.plan.base_url', 'https://suggestion.example.com')
            ->assertJsonMissingPath('data.plan.credentials');
    }

    public function test_profile_generation_requires_confirmed_sample_url_and_pins_inputs(): void
    {
        $this->seed();
        $admin = User::query()->where('email', 'platform@imobiliaria.com')->firstOrFail();
        $agency = CrawlAgency::query()->create([
            'name' => 'Profile Source',
            'slug' => 'profile-source',
            'base_url' => 'https://profile.example.com',
            'root_domain' => 'profile.example.com',
        ]);
        $contract = MarketDataContractVersion::query()->create([
            'version' => 1,
            'status' => 'active',
            'fields' => [['name' => 'title', 'type' => 'string', 'required' => true, 'normalization' => ['trim']]],
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
            'content_hash' => str_repeat('a', 64),
        ]);

        $payload = [
            'crawl_agency_id' => $agency->id,
            'discovery_snapshot_id' => $snapshot->id,
            'market_data_contract_version_id' => $contract->id,
            'sample_url' => 'https://profile.example.com/imovel/1',
            'sample_url_confirmed' => false,
        ];

        $this->actingAs($admin)
            ->postJson('/api/v1/admin/crawler/extraction-profiles/generate', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('sample_url_confirmed');

        $this->actingAs($admin)
            ->postJson('/api/v1/admin/crawler/extraction-profiles/generate', [
                ...$payload,
                'sample_url_confirmed' => true,
            ])
            ->assertCreated()
            ->assertJsonPath('data.type', 'profile_generation')
            ->assertJsonPath('data.plan.discovery_snapshot_id', $snapshot->id)
            ->assertJsonPath('data.plan.sample_url', 'https://profile.example.com/imovel/1')
            ->assertJsonPath('data.plan.market_data_contract_version_id', $contract->id);
    }
}
