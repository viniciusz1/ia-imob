<?php

namespace Tests\Feature\Crawler;

use App\Models\Crawler\CrawlAgency;
use App\Models\Crawler\CrawlerOperation;
use App\Models\Crawler\DiscoverySnapshot;
use App\Models\Crawler\DiscoverySnapshotUrl;
use App\Models\Crawler\ExtractionProfile;
use App\Models\Crawler\MarketDataContractVersion;
use App\Models\Crawler\ProfileValidationRecord;
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
            'blocking_failures' => ['no_valid_records'],
            'warnings' => ['one normalization warning'],
            'eligible' => false,
        ]);

        $this->actingAs($admin)
            ->postJson("/api/v1/admin/crawler/extraction-profiles/{$profile->id}/decision", [
                'decision' => 'approved',
                'reason' => 'Abaixo da recomendação, mas aprovado após revisão humana.',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'approved');

        $profile->refresh();
        $this->assertSame($admin->id, $profile->decided_by);
        $this->assertNotNull($profile->decided_at);
        $this->assertSame('Abaixo da recomendação, mas aprovado após revisão humana.', $profile->decision_reason);

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

    public function test_profile_summaries_omit_evidence_and_records_are_inspected_on_demand(): void
    {
        [$admin, $agency, , , $profile] = $this->fixtures();
        $operation = CrawlerOperation::query()->create([
            'type' => 'profile_validation',
            'state' => 'succeeded',
            'requested_by' => $admin->id,
            'crawl_agency_id' => $agency->id,
            'plan' => ['extraction_profile_id' => $profile->id],
        ]);
        $report = ProfileValidationReport::query()->create([
            'operation_id' => $operation->id,
            'extraction_profile_id' => $profile->id,
            'sampled_url_count' => 4,
            'valid_record_count' => 2,
            'valid_ratio' => 0.5,
            'required_field_coverage' => ['title' => 1.0],
            'blocking_failures' => ['low_valid_ratio'],
            'warnings' => [],
            'eligible' => false,
        ]);

        foreach ([
            ['url' => 'https://validation.example.com/property/valid', 'is_valid' => true, 'errors' => []],
            ['url' => 'https://validation.example.com/property/missing-title', 'is_valid' => false, 'errors' => ['title_missing']],
            ['url' => 'https://validation.example.com/property/missing-price', 'is_valid' => false, 'errors' => ['price_missing']],
        ] as $record) {
            ProfileValidationRecord::query()->create([
                'profile_validation_report_id' => $report->id,
                'url' => $record['url'],
                'raw_data' => ['title' => 'Raw title'],
                'normalized_data' => $record['is_valid'] ? ['title' => 'Raw title'] : null,
                'errors' => $record['errors'],
                'field_presence' => ['title' => true],
                'is_valid' => $record['is_valid'],
            ]);
        }
        ProfileValidationRecord::query()->create([
            'profile_validation_report_id' => $report->id,
            'url' => 'https://validation.example.com/property/normalization-warning',
            'raw_data' => ['title' => 'Raw title'],
            'normalized_data' => ['title' => 'Raw title', '_quality' => ['valid' => true, 'warnings' => ['title_trimmed']]],
            'errors' => [],
            'field_presence' => ['title' => true],
            'is_valid' => true,
        ]);

        $this->actingAs($admin)
            ->getJson("/api/v1/admin/crawler/crawl-agencies/{$agency->id}/extraction-profiles")
            ->assertOk()
            ->assertJsonPath('data.0.latest_validation_report.id', $report->id)
            ->assertJsonMissingPath('data.0.latest_validation_report.records');

        $otherOperation = CrawlerOperation::query()->create([
            'type' => 'profile_validation',
            'state' => 'succeeded',
            'requested_by' => $admin->id,
            'crawl_agency_id' => $agency->id,
            'plan' => ['extraction_profile_id' => $profile->id],
        ]);
        $otherReport = ProfileValidationReport::query()->create([
            'operation_id' => $otherOperation->id,
            'extraction_profile_id' => $profile->id,
            'sampled_url_count' => 1,
            'valid_record_count' => 0,
            'valid_ratio' => 0,
            'required_field_coverage' => ['title' => 0],
            'blocking_failures' => ['no_valid_records'],
            'warnings' => [],
            'eligible' => false,
        ]);
        ProfileValidationRecord::query()->create([
            'profile_validation_report_id' => $otherReport->id,
            'url' => 'https://other.example.com/missing-secret',
            'raw_data' => ['title' => 'Must not leak'],
            'normalized_data' => null,
            'errors' => ['title_missing'],
            'field_presence' => ['title' => false],
            'is_valid' => false,
        ]);

        $this->actingAs($admin)
            ->getJson("/api/v1/admin/crawler/crawl-agencies/{$agency->id}/extraction-profiles/{$profile->id}/profile-validation-reports/{$report->id}/records?filter=issues&search=missing&per_page=1")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.is_valid', false)
            ->assertJsonPath('meta.total', 2)
            ->assertJsonPath('meta.per_page', 1)
            ->assertJsonMissing(['missing-secret']);

        $this->actingAs($admin)
            ->getJson("/api/v1/admin/crawler/crawl-agencies/{$agency->id}/extraction-profiles/{$profile->id}/profile-validation-reports/{$report->id}/records?filter=issues&per_page=20")
            ->assertOk()
            ->assertJsonPath('meta.total', 3);

        $otherAgency = CrawlAgency::query()->create([
            'name' => 'Other Source',
            'slug' => 'other-source',
            'base_url' => 'https://other.example.com',
            'root_domain' => 'other.example.com',
        ]);
        $this->actingAs($admin)
            ->getJson("/api/v1/admin/crawler/crawl-agencies/{$otherAgency->id}/extraction-profiles/{$profile->id}/profile-validation-reports/{$report->id}/records")
            ->assertNotFound();

        $otherProfile = $profile->replicate();
        $otherProfileOperation = CrawlerOperation::query()->create([
            'type' => 'profile_generation',
            'state' => 'succeeded',
            'requested_by' => $admin->id,
            'crawl_agency_id' => $agency->id,
            'plan' => ['sample_url' => $profile->sample_url],
        ]);
        $otherProfile->created_by_operation_id = $otherProfileOperation->id;
        $otherProfile->version = 2;
        $otherProfile->save();
        $this->actingAs($admin)
            ->getJson("/api/v1/admin/crawler/crawl-agencies/{$agency->id}/extraction-profiles/{$otherProfile->id}/profile-validation-reports/{$report->id}/records")
            ->assertNotFound();
    }

    public function test_evidence_requires_authentication(): void
    {
        [, , , , $profile] = $this->fixtures();
        $report = ProfileValidationReport::query()->create([
            'operation_id' => $profile->created_by_operation_id,
            'extraction_profile_id' => $profile->id,
            'sampled_url_count' => 0,
            'valid_record_count' => 0,
            'valid_ratio' => 0,
            'required_field_coverage' => [],
            'blocking_failures' => [],
            'warnings' => [],
            'eligible' => false,
        ]);

        $this->getJson("/api/v1/admin/crawler/crawl-agencies/{$profile->crawl_agency_id}/extraction-profiles/{$profile->id}/profile-validation-reports/{$report->id}/records")
            ->assertUnauthorized();
    }

    public function test_approval_requires_a_report_and_a_non_blank_auditable_reason(): void
    {
        [$admin, , , , $profile] = $this->fixtures();

        $this->actingAs($admin)
            ->postJson("/api/v1/admin/crawler/extraction-profiles/{$profile->id}/decision", [
                'decision' => 'approved',
                'reason' => 'Revisado pelo operador.',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('decision');

        $operation = CrawlerOperation::query()->create([
            'type' => 'profile_validation',
            'state' => 'succeeded',
            'requested_by' => $admin->id,
            'crawl_agency_id' => $profile->crawl_agency_id,
            'plan' => ['extraction_profile_id' => $profile->id],
        ]);
        ProfileValidationReport::query()->create([
            'operation_id' => $operation->id,
            'extraction_profile_id' => $profile->id,
            'sampled_url_count' => 1,
            'valid_record_count' => 0,
            'valid_ratio' => 0,
            'required_field_coverage' => ['title' => 0],
            'blocking_failures' => ['no_valid_records'],
            'warnings' => [],
            'eligible' => false,
        ]);

        $this->actingAs($admin)
            ->postJson("/api/v1/admin/crawler/extraction-profiles/{$profile->id}/decision", [
                'decision' => 'approved',
                'reason' => '   ',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('reason');
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
