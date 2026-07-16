<?php

namespace Tests\Feature\Crawler;

use App\Models\Crawler\CrawlAgency;
use App\Models\Crawler\CrawlerOperation;
use App\Models\Crawler\DiscoverySnapshot;
use App\Models\Crawler\ExtractionProfile;
use App\Models\Crawler\MarketDataContractVersion;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CrawlerScheduleApiTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
        $this->admin = User::query()->where('email', 'platform@imobiliaria.com')->firstOrFail();
    }

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();
        parent::tearDown();
    }

    public function test_timezone_inheritance_override_and_due_dispatch_create_normal_fresh_crawl(): void
    {
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-07-15 10:00:00 UTC'));
        [$agency, $profile] = $this->activeAgency('scheduled');

        $this->actingAs($this->admin)->putJson('/api/v1/admin/crawler/schedule-default', [
            'preset' => 'daily',
            'timezone' => 'America/Sao_Paulo',
        ])->assertOk()->assertJsonPath('data.preset', 'daily');
        $inherited = $this->actingAs($this->admin)->putJson("/api/v1/admin/crawler/crawl-agencies/{$agency->id}/schedule", [
            'inherit_default' => true,
        ])->assertOk()
            ->assertJsonPath('data.effective_preset', 'daily')
            ->assertJsonPath('data.effective_timezone', 'America/Sao_Paulo')
            ->assertJsonPath('data.next_run_at', '2026-07-16T06:00:00.000000Z')
            ->json('data');

        DB::table('crawler.crawl_agency_schedules')->where('id', $inherited['id'])->update(['next_run_at' => now()->subMinute()]);
        $this->artisan('crawler:dispatch-schedules')->assertSuccessful();
        $operation = CrawlerOperation::query()->where('type', 'production_crawl')->firstOrFail();
        $this->assertSame('fresh', $operation->plan['discovery']['mode']);
        $this->assertSame($profile->id, $operation->plan['extraction_profile']['id']);
        $this->assertSame('scheduled', $operation->plan['trigger']);

        DB::table('crawler.crawl_agency_schedules')->where('id', $inherited['id'])->update(['next_run_at' => now()->subMinute()]);
        $this->artisan('crawler:dispatch-schedules')->assertSuccessful();
        $this->assertDatabaseCount('crawler.operations', 3); // discovery + profile generation + one coalesced production crawl

        $this->actingAs($this->admin)->putJson("/api/v1/admin/crawler/crawl-agencies/{$agency->id}/schedule", [
            'inherit_default' => false,
            'preset' => 'twice_weekly',
            'timezone' => 'UTC',
        ])->assertOk()
            ->assertJsonPath('data.effective_preset', 'twice_weekly')
            ->assertJsonPath('data.effective_timezone', 'UTC');

        $agency->update(['lifecycle_state' => 'paused']);
        DB::table('crawler.crawl_agency_schedules')->where('crawl_agency_id', $agency->id)->update(['next_run_at' => now()->subMinute()]);
        $this->artisan('crawler:dispatch-schedules')->assertSuccessful();
        $this->assertDatabaseCount('crawler.operations', 3);
    }

    public function test_three_production_failures_open_circuit_onboarding_failures_do_not_and_manual_success_closes_it(): void
    {
        [$agency] = $this->activeAgency('circuit');
        $this->actingAs($this->admin)->putJson("/api/v1/admin/crawler/crawl-agencies/{$agency->id}/schedule", [
            'inherit_default' => false,
            'preset' => 'daily',
            'timezone' => 'UTC',
        ])->assertOk();
        CrawlerOperation::query()->create([
            'type' => 'profile_validation', 'state' => 'failed', 'requested_by' => $this->admin->id,
            'crawl_agency_id' => $agency->id, 'plan' => [],
        ]);
        foreach (range(1, 3) as $attempt) {
            CrawlerOperation::query()->forceCreate([
                'type' => 'production_crawl', 'state' => 'failed', 'requested_by' => $this->admin->id,
                'crawl_agency_id' => $agency->id, 'plan' => ['attempt' => $attempt], 'completed_at' => now(),
            ]);
        }

        $this->artisan('crawler:update-circuits')->assertSuccessful();
        $this->assertDatabaseHas('crawler.crawl_agency_circuits', [
            'crawl_agency_id' => $agency->id,
            'state' => 'open',
            'consecutive_failures' => 3,
        ]);
        $this->assertSame('active', $agency->refresh()->lifecycle_state);

        DB::table('crawler.crawl_agency_schedules')->where('crawl_agency_id', $agency->id)->update(['next_run_at' => now()->subMinute()]);
        $this->artisan('crawler:dispatch-schedules')->assertSuccessful();
        $this->assertSame(3, CrawlerOperation::query()->where('type', 'production_crawl')->count());

        $manual = $this->actingAs($this->admin)->postJson('/api/v1/admin/crawler/production-crawls', [
            'crawl_agency_id' => $agency->id,
            'discovery_mode' => 'fresh',
        ])->assertCreated()->json('data');
        CrawlerOperation::query()->findOrFail($manual['id'])->forceFill(['state' => 'succeeded', 'completed_at' => now()])->save();
        $this->artisan('crawler:update-circuits')->assertSuccessful();

        $this->assertDatabaseHas('crawler.crawl_agency_circuits', [
            'crawl_agency_id' => $agency->id,
            'state' => 'closed',
            'consecutive_failures' => 0,
        ]);
    }

    private function activeAgency(string $suffix): array
    {
        $agency = CrawlAgency::query()->create([
            'name' => "Schedule {$suffix}",
            'slug' => "schedule-{$suffix}",
            'base_url' => "https://{$suffix}.schedule.example.com",
            'root_domain' => "{$suffix}.schedule.example.com",
            'lifecycle_state' => 'active',
        ]);
        $contract = MarketDataContractVersion::query()->create([
            'version' => ((int) MarketDataContractVersion::query()->max('version')) + 1,
            'status' => 'active',
            'fields' => [['name' => 'url', 'type' => 'url', 'required' => true, 'normalization' => []]],
            'affected_agency_ids' => [],
            'created_by' => $this->admin->id,
        ]);
        $discovery = CrawlerOperation::query()->create([
            'type' => 'discovery', 'state' => 'succeeded', 'requested_by' => $this->admin->id,
            'crawl_agency_id' => $agency->id, 'plan' => [],
        ]);
        $snapshot = DiscoverySnapshot::query()->create([
            'operation_id' => $discovery->id,
            'crawl_agency_id' => $agency->id,
            'url_count' => 1,
            'content_hash' => hash('sha256', $suffix),
        ]);
        $generation = CrawlerOperation::query()->create([
            'type' => 'profile_generation', 'state' => 'succeeded', 'requested_by' => $this->admin->id,
            'crawl_agency_id' => $agency->id, 'market_data_contract_version_id' => $contract->id, 'plan' => [],
        ]);
        $profile = ExtractionProfile::query()->create([
            'crawl_agency_id' => $agency->id,
            'discovery_snapshot_id' => $snapshot->id,
            'market_data_contract_version_id' => $contract->id,
            'created_by_operation_id' => $generation->id,
            'version' => 1,
            'status' => 'active',
            'sample_url' => "{$agency->base_url}/property/1",
            'schemas' => ['xpath' => []],
            'strategies' => ['xpath'],
            'fields' => $contract->fields,
            'parameters' => [],
        ]);

        return [$agency, $profile];
    }
}
