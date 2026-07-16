<?php

namespace Tests\Feature\Crawler;

use App\Models\Crawler\CrawlAgency;
use App\Models\Crawler\CrawlerOperation;
use App\Models\Crawler\DiscoverySnapshot;
use App\Models\Crawler\DiscoverySnapshotUrl;
use App\Models\Crawler\ExtractionProfile;
use App\Models\Crawler\MarketDataContractVersion;
use App\Models\Crawler\ProfileValidationReport;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class ExtractionProfileValidationApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_validation_samples_urls_and_keeps_profile_and_agency_approval_separate(): void
    {
        [$admin, $agency, $contract, $snapshot, $profile] = $this->fixtures();

        $response = $this->actingAs($admin)
            ->postJson("/api/v1/admin/crawler/extraction-profiles/{$profile->id}/validation")
            ->assertCreated()
            ->assertJsonPath('data.type', 'profile_validation')
            ->assertJsonCount(20, 'data.plan.urls');

        $operation = CrawlerOperation::query()->findOrFail($response->json('data.id'));
        $this->assertSame('https://validation.example.com/property/1', $operation->plan['urls'][0]);
        $this->assertSame('https://validation.example.com/property/25', $operation->plan['urls'][19]);

        $report = ProfileValidationReport::query()->create([
            'operation_id' => $operation->id,
            'extraction_profile_id' => $profile->id,
            'sampled_url_count' => 20,
            'valid_record_count' => 15,
            'valid_ratio' => 0.75,
            'required_field_coverage' => ['title' => 1.0],
            'blocking_failures' => [],
            'warnings' => ['one normalization warning'],
            'eligible' => false,
        ]);

        $this->actingAs($admin)
            ->postJson("/api/v1/admin/crawler/extraction-profiles/{$profile->id}/decision", [
                'decision' => 'approved',
                'reason' => 'Looks acceptable.',
            ])
            ->assertUnprocessable();

        $report->update([
            'valid_record_count' => 16,
            'valid_ratio' => 0.80,
            'eligible' => true,
        ]);

        $this->actingAs($admin)
            ->postJson("/api/v1/admin/crawler/extraction-profiles/{$profile->id}/decision", [
                'decision' => 'approved',
                'reason' => 'Evidence reviewed despite the warning.',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'approved');

        $this->actingAs($admin)
            ->postJson("/api/v1/admin/crawler/extraction-profiles/{$profile->id}/activate")
            ->assertOk()
            ->assertJsonPath('data.status', 'active');

        $this->assertSame('onboarding', $agency->refresh()->lifecycle_state);

        $profileReviewer = User::factory()->create(['agency_id' => null]);
        $profileReviewer->givePermissionTo(Permission::findByName('crawler.profiles.approve', 'web'));

        $this->actingAs($profileReviewer)
            ->postJson("/api/v1/admin/crawler/crawl-agencies/{$agency->id}/activate")
            ->assertForbidden();

        $this->actingAs($admin)
            ->postJson("/api/v1/admin/crawler/crawl-agencies/{$agency->id}/activate")
            ->assertOk()
            ->assertJsonPath('data.lifecycle_state', 'active');
    }

    public function test_incompatible_contract_requires_revalidation_without_changing_lifecycle(): void
    {
        [$admin, $agency, $contract, , $profile] = $this->fixtures();
        $agency->update(['lifecycle_state' => 'active']);
        $profile->update(['status' => 'active']);
        $contract->update(['status' => 'superseded']);
        $nextContract = MarketDataContractVersion::query()->create([
            'version' => 2,
            'status' => 'validating',
            'compatibility' => 'incompatible',
            'fields' => [
                ['name' => 'title', 'type' => 'string', 'required' => true, 'normalization' => []],
                ['name' => 'price', 'type' => 'decimal', 'required' => true, 'normalization' => []],
            ],
            'affected_agency_ids' => [$agency->id],
            'created_by' => $admin->id,
        ]);

        $this->actingAs($admin)
            ->postJson("/api/v1/admin/crawler/market-data-contracts/{$nextContract->id}/activate")
            ->assertOk();

        $this->assertSame('active', $agency->refresh()->lifecycle_state);
        $this->assertTrue($agency->revalidation_required);
        $this->assertSame('revalidation_required', $profile->refresh()->status);
    }

    private function fixtures(): array
    {
        $this->seed();
        $admin = User::query()->where('email', 'platform@imobiliaria.com')->firstOrFail();
        $agency = CrawlAgency::query()->create([
            'name' => 'Validation Source',
            'slug' => 'validation-source',
            'base_url' => 'https://validation.example.com',
            'root_domain' => 'validation.example.com',
        ]);
        $contract = MarketDataContractVersion::query()->create([
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
            'url_count' => 25,
            'content_hash' => str_repeat('b', 64),
        ]);
        foreach (range(1, 25) as $index) {
            DiscoverySnapshotUrl::query()->create([
                'discovery_snapshot_id' => $snapshot->id,
                'url' => "https://validation.example.com/property/{$index}",
                'url_hash' => hash('sha256', "https://validation.example.com/property/{$index}"),
            ]);
        }
        $generationOperation = CrawlerOperation::query()->create([
            'type' => 'profile_generation',
            'state' => 'succeeded',
            'requested_by' => $admin->id,
            'crawl_agency_id' => $agency->id,
            'market_data_contract_version_id' => $contract->id,
            'plan' => ['sample_url' => 'https://validation.example.com/property/1'],
        ]);
        $profile = ExtractionProfile::query()->create([
            'crawl_agency_id' => $agency->id,
            'discovery_snapshot_id' => $snapshot->id,
            'market_data_contract_version_id' => $contract->id,
            'created_by_operation_id' => $generationOperation->id,
            'version' => 1,
            'status' => 'candidate',
            'sample_url' => 'https://validation.example.com/property/1',
            'schemas' => ['xpath' => ['baseSelector' => '//body', 'fields' => []]],
            'strategies' => ['xpath'],
            'fields' => $contract->fields,
            'parameters' => [],
        ]);

        return [$admin, $agency, $contract, $snapshot, $profile];
    }
}
