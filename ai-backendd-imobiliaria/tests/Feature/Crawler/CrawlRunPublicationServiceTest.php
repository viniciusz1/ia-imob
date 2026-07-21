<?php

namespace Tests\Feature\Crawler;

use App\Models\Crawler\CrawlAgency;
use App\Models\Crawler\CrawlerOperation;
use App\Models\Crawler\DiscoverySnapshot;
use App\Models\Crawler\MarketDataContractVersion;
use App\Models\Crawler\QualityPolicyVersion;
use App\Models\CrawlerRun;
use App\Models\MarketProperty;
use App\Models\User;
use App\Services\Crawler\CrawlRunPublicationService;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CrawlRunPublicationServiceTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
        $this->admin = User::query()->where('email', 'platform@imobiliaria.com')->firstOrFail();
    }

    public function test_approved_candidate_atomically_replaces_only_the_current_pointer(): void
    {
        $agency = $this->agency('publish');
        $first = $this->candidate($agency, 2, 1);
        $firstProperty = $first->marketProperties()->firstOrFail();

        $firstReport = app(CrawlRunPublicationService::class)->evaluate($first);

        $this->assertSame('approved', $firstReport->verdict);
        $this->assertSame('published', $first->refresh()->publication_state);
        $this->assertSame($first->id, $agency->refresh()->current_published_crawl_run_id);
        $this->assertSame([$firstProperty->id], MarketProperty::query()->latestRun()->pluck('id')->all());

        $second = $this->candidate($agency, 3, 1);
        $secondProperty = $second->marketProperties()->firstOrFail();
        app(CrawlRunPublicationService::class)->evaluate($second);

        $this->assertSame('published', $first->refresh()->publication_state);
        $this->assertSame($second->id, $agency->refresh()->current_published_crawl_run_id);
        $this->assertEqualsCanonicalizing(
            [$firstProperty->id, $secondProperty->id],
            MarketProperty::query()->latestRun()->pluck('id')->all(),
        );
    }

    public function test_blocking_quality_failures_quarantine_candidate_and_preserve_previous_publication(): void
    {
        $agency = $this->agency('quarantine');
        $published = $this->candidate($agency, 1, 1);
        app(CrawlRunPublicationService::class)->evaluate($published);

        $empty = $this->candidate($agency, 0, 0);
        $report = app(CrawlRunPublicationService::class)->evaluate($empty);

        $this->assertSame('blocked', $report->verdict);
        $this->assertEqualsCanonicalizing(['empty_discovery', 'zero_valid_records'], $report->blockers);
        $this->assertSame('quarantined', $empty->refresh()->publication_state);
        $this->assertSame($published->id, $agency->refresh()->current_published_crawl_run_id);
        $this->assertSame($empty->market_data_contract_version_id, $report->market_data_contract_version_id);
        $this->assertSame($empty->quality_policy_version_id, $report->quality_policy_version_id);
    }

    public function test_old_contract_results_are_preserved_but_cannot_publish(): void
    {
        $agency = $this->agency('old-contract');
        $oldContract = MarketDataContractVersion::query()->create([
            'version' => MarketDataContractVersion::query()->max('version') + 1,
            'status' => 'superseded',
            'fields' => [],
            'affected_agency_ids' => [],
            'created_by' => $this->admin->id,
        ]);
        $candidate = $this->candidate($agency, 3, 2, $oldContract);

        $report = app(CrawlRunPublicationService::class)->evaluate($candidate);

        $this->assertContains('contract_not_current', $report->blockers);
        $this->assertSame('quarantined', $candidate->refresh()->publication_state);
        $this->assertDatabaseCount('crawler.market_properties', 2);
    }

    public function test_publication_pointer_failure_rolls_back_report_and_snapshot_transition(): void
    {
        $agency = $this->agency('rollback');
        $candidate = $this->candidate($agency, 2, 1);
        DB::unprepared(<<<'SQL'
            CREATE FUNCTION crawler.reject_test_publication() RETURNS trigger AS $$
            BEGIN
                RAISE EXCEPTION 'forced publication failure';
            END;
            $$ LANGUAGE plpgsql;
            CREATE TRIGGER reject_test_publication
            BEFORE UPDATE OF current_published_crawl_run_id ON crawler.crawl_agencies
            FOR EACH ROW EXECUTE FUNCTION crawler.reject_test_publication();
        SQL);

        try {
            app(CrawlRunPublicationService::class)->evaluate($candidate);
            $this->fail('The database trigger should reject the pointer update.');
        } catch (QueryException) {
            $this->assertSame('candidate', $candidate->refresh()->publication_state);
            $this->assertNull($agency->refresh()->current_published_crawl_run_id);
            $this->assertDatabaseMissing('crawler.quality_gate_reports', ['crawl_run_id' => $candidate->id]);
        } finally {
            DB::unprepared(<<<'SQL'
                DROP TRIGGER IF EXISTS reject_test_publication ON crawler.crawl_agencies;
                DROP FUNCTION IF EXISTS crawler.reject_test_publication();
            SQL);
        }
    }

    private function agency(string $suffix): CrawlAgency
    {
        return CrawlAgency::query()->create([
            'name' => "Publication {$suffix}",
            'slug' => "publication-{$suffix}",
            'base_url' => "https://{$suffix}.publication.example.com",
            'root_domain' => "{$suffix}.publication.example.com",
            'lifecycle_state' => 'active',
        ]);
    }

    private function candidate(
        CrawlAgency $agency,
        int $discovered,
        int $normalized,
        ?MarketDataContractVersion $contract = null,
    ): CrawlerRun {
        $contract ??= MarketDataContractVersion::query()->where('status', 'active')->firstOrFail();
        $operation = CrawlerOperation::query()->create([
            'type' => 'production_crawl',
            'state' => 'succeeded',
            'requested_by' => $this->admin->id,
            'crawl_agency_id' => $agency->id,
            'market_data_contract_version_id' => $contract->id,
            'plan' => [],
        ]);
        $snapshot = DiscoverySnapshot::query()->create([
            'operation_id' => $operation->id,
            'crawl_agency_id' => $agency->id,
            'url_count' => $discovered,
            'content_hash' => hash('sha256', "{$operation->id}:{$discovered}"),
        ]);
        $run = CrawlerRun::query()->create([
            'operation_id' => $operation->id,
            'crawl_agency_id' => $agency->id,
            'discovery_snapshot_id' => $snapshot->id,
            'market_data_contract_version_id' => $contract->id,
            'quality_policy_version_id' => QualityPolicyVersion::query()->where('status', 'active')->firstOrFail()->id,
            'technical_state' => 'succeeded',
            'publication_state' => 'candidate',
            'publishable' => $normalized > 0,
            'raw_count' => $normalized,
            'normalized_count' => $normalized,
            'completed_at' => now(),
        ]);
        MarketProperty::factory()->count($normalized)->create(['crawler_run_id' => $run->id]);

        return $run;
    }
}
