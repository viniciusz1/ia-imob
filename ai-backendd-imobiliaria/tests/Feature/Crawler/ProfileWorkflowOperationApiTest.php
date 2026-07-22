<?php

namespace Tests\Feature\Crawler;

use App\Models\Crawler\CrawlAgency;
use App\Models\Crawler\CrawlerOperation;
use App\Models\Crawler\DiscoverySnapshot;
use App\Models\Crawler\DiscoverySnapshotUrl;
use App\Models\Crawler\ExtractionProfile;
use App\Models\Crawler\MarketDataContractVersion;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfileWorkflowOperationApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_equivalent_commands_coalesce_and_all_active_profile_operations_are_recovered(): void
    {
        [$admin, $agency, $contract, $snapshot, $profile] = $this->fixtures();

        $suggestionId = $this->actingAs($admin)
            ->postJson("/api/v1/admin/crawler/crawl-agencies/{$agency->id}/sample-url-suggestion")
            ->assertCreated()
            ->json('data.id');
        $this->actingAs($admin)
            ->postJson("/api/v1/admin/crawler/crawl-agencies/{$agency->id}/sample-url-suggestion")
            ->assertOk()
            ->assertJsonPath('data.id', $suggestionId);

        $generationPayload = [
            'crawl_agency_id' => $agency->id,
            'discovery_snapshot_id' => $snapshot->id,
            'market_data_contract_version_id' => $contract->id,
            'sample_url' => 'https://workflow.example.com/property/1',
            'sample_url_confirmed' => true,
        ];
        $generationId = $this->actingAs($admin)
            ->postJson('/api/v1/admin/crawler/extraction-profiles/generate', $generationPayload)
            ->assertCreated()
            ->json('data.id');
        $this->actingAs($admin)
            ->postJson('/api/v1/admin/crawler/extraction-profiles/generate', $generationPayload)
            ->assertOk()
            ->assertJsonPath('data.id', $generationId);

        $validationId = $this->actingAs($admin)
            ->postJson("/api/v1/admin/crawler/extraction-profiles/{$profile->id}/validation")
            ->assertCreated()
            ->json('data.id');
        $this->actingAs($admin)
            ->postJson("/api/v1/admin/crawler/extraction-profiles/{$profile->id}/validation")
            ->assertOk()
            ->assertJsonPath('data.id', $validationId);

        foreach (range(1, 20) as $index) {
            CrawlerOperation::query()->create([
                'type' => 'profile_generation',
                'state' => $index % 2 === 0 ? 'failed' : 'cancelled',
                'requested_by' => $admin->id,
                'crawl_agency_id' => $agency->id,
                'plan' => ['terminal' => $index],
            ]);
        }

        $operationIds = $this->actingAs($admin)
            ->getJson("/api/v1/admin/crawler/crawl-agencies/{$agency->id}/profile-workflow-operations")
            ->assertOk()
            ->json('data');
        $operationIds = collect($operationIds)->pluck('id');

        $this->assertTrue($operationIds->contains($suggestionId));
        $this->assertTrue($operationIds->contains($generationId));
        $this->assertTrue($operationIds->contains($validationId));
        $this->assertCount(13, $operationIds);
    }

    private function fixtures(): array
    {
        $this->seed();
        $admin = User::query()->where('email', 'platform@imobiliaria.com')->firstOrFail();
        $agency = CrawlAgency::query()->create([
            'name' => 'Workflow Source',
            'slug' => 'workflow-source',
            'base_url' => 'https://workflow.example.com',
            'root_domain' => 'workflow.example.com',
        ]);
        $contract = MarketDataContractVersion::query()->where('status', 'active')->first()
            ?? MarketDataContractVersion::query()->create([
                'version' => 1,
                'status' => 'active',
                'fields' => [['name' => 'title', 'type' => 'string', 'required' => true, 'normalization' => []]],
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
            'url' => 'https://workflow.example.com/property/1',
            'url_hash' => hash('sha256', 'https://workflow.example.com/property/1'),
        ]);
        $profile = ExtractionProfile::query()->create([
            'crawl_agency_id' => $agency->id,
            'discovery_snapshot_id' => $snapshot->id,
            'market_data_contract_version_id' => $contract->id,
            'created_by_operation_id' => $discoveryOperation->id,
            'version' => 1,
            'status' => 'candidate',
            'sample_url' => 'https://workflow.example.com/property/1',
            'schemas' => [],
            'strategies' => [],
            'fields' => $contract->fields,
            'parameters' => [],
        ]);

        return [$admin, $agency, $contract, $snapshot, $profile];
    }
}
