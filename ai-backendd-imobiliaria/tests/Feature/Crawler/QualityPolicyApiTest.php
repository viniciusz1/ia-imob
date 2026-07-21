<?php

namespace Tests\Feature\Crawler;

use App\Models\Crawler\CrawlAgency;
use App\Models\Crawler\CrawlerOperation;
use App\Models\Crawler\DiscoverySnapshot;
use App\Models\Crawler\MarketDataContractVersion;
use App\Models\Crawler\QualityPolicyVersion;
use App\Models\CrawlerRun;
use App\Models\User;
use App\Services\Crawler\CrawlRunPublicationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class QualityPolicyApiTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
        $this->admin = User::query()->where('email', 'platform@imobiliaria.com')->firstOrFail();
    }

    public function test_policy_follows_draft_validating_active_and_active_rules_are_immutable(): void
    {
        $draft = $this->actingAs($this->admin)->postJson('/api/v1/admin/crawler/quality-policies', [
            'rules' => [
                'maximum_stock_drop_ratio' => 0.5,
                'maximum_error_ratio' => 0.3,
                'maximum_rejection_ratio' => 0.3,
            ],
        ])->assertCreated()->assertJsonPath('data.status', 'draft')->json('data');

        $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/quality-policies/{$draft['id']}/validate")
            ->assertOk()
            ->assertJsonPath('data.status', 'validating');
        $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/quality-policies/{$draft['id']}/activate")
            ->assertOk()
            ->assertJsonPath('data.status', 'active');

        $active = QualityPolicyVersion::query()->findOrFail($draft['id']);
        $this->expectException(\LogicException::class);
        $active->update(['rules' => ['maximum_error_ratio' => 1]]);
    }

    public function test_fourth_publication_uses_first_three_as_baseline_and_blocks_catalogued_regressions(): void
    {
        $agency = $this->agency('baseline');
        foreach ([100, 100, 100] as $count) {
            $report = app(CrawlRunPublicationService::class)->evaluate($this->candidate($agency, $count, 100));
            $this->assertSame('approved', $report->verdict);
        }

        $report = app(CrawlRunPublicationService::class)->evaluate($this->candidate($agency, 49, 100, 31, 31));

        $this->assertSame('blocked', $report->verdict);
        $this->assertEqualsCanonicalizing(
            ['stock_drop_above_threshold', 'crawl_error_ratio_above_threshold', 'rejection_ratio_above_threshold'],
            $report->blockers,
        );
        $this->assertEquals(100.0, $report->evidence['baseline']['normalized_average']);
    }

    public function test_minor_regressions_publish_with_warnings_and_historical_verdict_stays_pinned(): void
    {
        $agency = $this->agency('warning');
        foreach ([100, 100, 100] as $count) {
            app(CrawlRunPublicationService::class)->evaluate($this->candidate($agency, $count, 100));
        }
        $run = $this->candidate($agency, 75, 100, 10, 10);
        $report = app(CrawlRunPublicationService::class)->evaluate($run);

        $this->assertSame('approved', $report->verdict);
        $this->assertContains('stock_drop_warning', $report->warnings);
        $this->assertContains('crawl_error_ratio_warning', $report->warnings);
        $this->assertContains('rejection_ratio_warning', $report->warnings);
        $this->assertSame($run->quality_policy_version_id, $report->quality_policy_version_id);
    }

    public function test_exception_and_exceptional_publication_preserve_report_and_require_permission_and_reason(): void
    {
        $agency = $this->agency('override');
        foreach ([100, 100, 100] as $count) {
            app(CrawlRunPublicationService::class)->evaluate($this->candidate($agency, $count, 100));
        }
        $quarantined = $this->candidate($agency, 40, 100);
        $report = app(CrawlRunPublicationService::class)->evaluate($quarantined);

        $this->actingAs($this->admin)->postJson("/api/v1/admin/crawler/quality-reports/{$report->id}/exceptions", [
            'reason' => 'Known seasonal inventory change with source confirmation.',
        ])->assertCreated();
        $this->assertSame('quarantined', $quarantined->refresh()->publication_state);

        Role::query()->where('name', 'Platform Admin')->firstOrFail()
            ->revokePermissionTo('crawler.snapshots.publish_exceptionally');
        $this->actingAs($this->admin)->postJson("/api/v1/admin/crawler/crawl-runs/{$quarantined->id}/exceptional-publication", [
            'reason' => 'Operator verified the source inventory manually.',
        ])->assertForbidden();
        $this->admin->givePermissionTo('crawler.snapshots.publish_exceptionally');

        $this->actingAs($this->admin)->postJson("/api/v1/admin/crawler/crawl-runs/{$quarantined->id}/exceptional-publication", [
            'reason' => 'Operator verified the source inventory manually.',
        ])->assertCreated()->assertJsonPath('data.publication_state', 'published');
        $this->assertSame('blocked', $report->refresh()->verdict);
        $this->assertDatabaseHas('crawler.exceptional_publications', [
            'crawl_run_id' => $quarantined->id,
            'published_by' => $this->admin->id,
        ]);

        $onboardingBlocker = $this->candidate($agency, 0, 0);
        app(CrawlRunPublicationService::class)->evaluate($onboardingBlocker);
        $this->actingAs($this->admin)->postJson("/api/v1/admin/crawler/crawl-runs/{$onboardingBlocker->id}/exceptional-publication", [
            'reason' => 'This must remain blocked despite a supplied reason.',
        ])->assertUnprocessable();
    }

    public function test_quality_index_consolidates_quarantined_and_exceptionally_published_snapshots(): void
    {
        $agency = $this->agency('quality-index');
        foreach ([100, 100, 100] as $count) {
            app(CrawlRunPublicationService::class)->evaluate($this->candidate($agency, $count, 100));
        }

        $exceptionallyPublished = $this->candidate($agency, 40, 100);
        app(CrawlRunPublicationService::class)->evaluate($exceptionallyPublished);
        $this->actingAs($this->admin)->postJson("/api/v1/admin/crawler/crawl-runs/{$exceptionallyPublished->id}/exceptional-publication", [
            'reason' => 'Operator verified the seasonal inventory directly with the agency.',
        ])->assertCreated();

        $quarantined = $this->candidate($agency, 20, 100);
        app(CrawlRunPublicationService::class)->evaluate($quarantined);

        $this->actingAs($this->admin)
            ->getJson('/api/v1/admin/crawler/quality-snapshots')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $quarantined->id)
            ->assertJsonPath('data.0.publication_state', 'quarantined')
            ->assertJsonPath('data.1.id', $exceptionallyPublished->id)
            ->assertJsonPath('data.1.publication_state', 'published')
            ->assertJsonPath(
                'data.1.exceptional_publication.reason',
                'Operator verified the seasonal inventory directly with the agency.'
            );
    }

    private function agency(string $suffix): CrawlAgency
    {
        return CrawlAgency::query()->create([
            'name' => "Quality {$suffix}",
            'slug' => "quality-{$suffix}",
            'base_url' => "https://{$suffix}.quality.example.com",
            'root_domain' => "{$suffix}.quality.example.com",
            'lifecycle_state' => 'active',
        ]);
    }

    private function candidate(
        CrawlAgency $agency,
        int $normalized,
        int $raw,
        int $errors = 0,
        int $rejected = 0,
    ): CrawlerRun {
        $contract = MarketDataContractVersion::query()->where('status', 'active')->firstOrFail();
        $policy = QualityPolicyVersion::query()->where('status', 'active')->latest('version')->firstOrFail();
        $operation = CrawlerOperation::query()->create([
            'type' => 'production_crawl', 'state' => 'succeeded', 'requested_by' => $this->admin->id,
            'crawl_agency_id' => $agency->id, 'market_data_contract_version_id' => $contract->id, 'plan' => [],
        ]);
        $snapshot = DiscoverySnapshot::query()->create([
            'operation_id' => $operation->id,
            'crawl_agency_id' => $agency->id,
            'url_count' => $raw,
            'content_hash' => hash('sha256', (string) $operation->id),
        ]);

        return CrawlerRun::query()->create([
            'operation_id' => $operation->id,
            'crawl_agency_id' => $agency->id,
            'discovery_snapshot_id' => $snapshot->id,
            'market_data_contract_version_id' => $contract->id,
            'quality_policy_version_id' => $policy->id,
            'technical_state' => 'succeeded',
            'result_kind' => 'full',
            'publication_state' => 'candidate',
            'publishable' => $normalized > 0,
            'raw_count' => $raw,
            'normalized_count' => $normalized,
            'rejected_count' => $rejected,
            'error_count' => $errors,
            'completed_at' => now(),
        ]);
    }
}
