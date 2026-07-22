<?php

namespace Tests\Feature\Crawler;

use App\Models\Crawler\CrawlAgency;
use App\Models\Crawler\CrawlerOperation;
use App\Models\Crawler\Prospect;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ProspectingGroupApiTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
        $this->admin = User::query()->where('email', 'platform@imobiliaria.com')->firstOrFail();
    }

    public function test_multi_city_request_previews_known_impact_and_creates_independent_group_members(): void
    {
        $this->prospect('known-joinville.com.br', 'Joinville');
        $this->prospect('known-blumenau.com.br', 'Blumenau');
        CrawlAgency::query()->create([
            'name' => 'Existing Agency',
            'slug' => 'existing-agency',
            'base_url' => 'https://existing.example.com',
            'root_domain' => 'existing.example.com',
            'lifecycle_state' => 'active',
        ]);

        $cities = [['city' => 'Joinville', 'state' => 'SC'], ['city' => 'Blumenau', 'state' => 'SC']];
        $this->actingAs($this->admin)
            ->postJson('/api/v1/admin/crawler/prospecting-requery-preview', ['cities' => $cities])
            ->assertOk()
            ->assertJsonPath('data.known_prospect_count', 2)
            ->assertJsonPath('data.known_crawl_agency_count', 1);

        $group = $this->actingAs($this->admin)
            ->postJson('/api/v1/admin/crawler/prospecting-operation-groups', [
                'name' => 'Norte SC',
                'cities' => $cities,
                'requery_known_domains' => true,
                'confirmed_known_domain_count' => 3,
            ])->assertCreated()
            ->assertJsonPath('data.member_count', 2)
            ->json('data');

        $this->assertSame(['Blumenau', 'Joinville'], collect($group['operations'])->pluck('plan.city')->sort()->values()->all());
        $this->assertTrue(collect($group['operations'])->every(fn (array $operation) => $operation['plan']['requery_known_domains']));
    }

    public function test_consolidated_review_filters_by_city_and_operation_observation(): void
    {
        $prospect = $this->prospect('observed.com.br', 'Joinville');
        $operation = CrawlerOperation::query()->create([
            'type' => 'prospecting', 'state' => 'succeeded', 'requested_by' => $this->admin->id,
            'plan' => ['city' => 'Joinville', 'state' => 'SC'],
        ]);
        DB::table('crawler.prospect_operation_observations')->insert([
            'prospect_id' => $prospect->id,
            'operation_id' => $operation->id,
            'city' => 'Joinville',
            'state' => 'SC',
            'automatic_classification' => 'candidate',
            'metadata' => '{}',
            'observed_at' => now(),
        ]);
        $agency = CrawlAgency::query()->create([
            'name' => 'Unchanged Agency', 'slug' => 'unchanged-agency',
            'base_url' => 'https://unchanged.example.com', 'root_domain' => 'unchanged.example.com',
        ]);
        DB::table('crawler.crawl_agency_suggestions')->insert([
            'crawl_agency_id' => $agency->id,
            'operation_id' => $operation->id,
            'differences' => '{"name":"Suggested Name"}',
            'state' => 'pending',
            'created_at' => now(),
        ]);

        $this->actingAs($this->admin)
            ->getJson("/api/v1/admin/crawler/prospects?city=Joinville&operation_id={$operation->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $prospect->id);
        $this->actingAs($this->admin)
            ->getJson('/api/v1/admin/crawler/crawl-agency-suggestions?state=pending')
            ->assertOk()
            ->assertJsonPath('data.0.differences.name', 'Suggested Name');
        $this->assertSame('Unchanged Agency', $agency->refresh()->name);
    }

    public function test_partial_group_retries_only_selected_failed_city_with_the_same_plan(): void
    {
        $group = $this->actingAs($this->admin)->postJson('/api/v1/admin/crawler/prospecting-operation-groups', [
            'name' => 'Retry cities',
            'cities' => [['city' => 'Joinville', 'state' => 'SC'], ['city' => 'Blumenau', 'state' => 'SC']],
            'requery_known_domains' => false,
        ])->assertCreated()->json('data');
        [$first, $second] = collect($group['operations'])->map(fn (array $item) => CrawlerOperation::query()->findOrFail($item['id']))->all();
        $first->forceFill(['state' => 'succeeded', 'completed_at' => now()])->save();
        $second->forceFill(['state' => 'failed', 'completed_at' => now()])->save();

        $this->actingAs($this->admin)->getJson("/api/v1/admin/crawler/operation-groups/{$group['id']}")
            ->assertOk()->assertJsonPath('data.result', 'partial');
        $retry = $this->actingAs($this->admin)->postJson("/api/v1/admin/crawler/operation-groups/{$group['id']}/actions", [
            'action' => 'retry',
            'operation_ids' => [$second->id],
        ])->assertCreated()->assertJsonPath('data.member_count', 1)->json('data.operations.0');

        $this->assertSame($second->id, $retry['retry_of_operation_id']);
        $this->assertSame($second->plan, $retry['plan']);
        $this->assertDatabaseCount('crawler.operations', 3);
    }

    private function prospect(string $domain, string $city): Prospect
    {
        return Prospect::query()->create([
            'root_domain' => $domain,
            'google_place_id' => "place-{$domain}",
            'name' => $domain,
            'city' => $city,
            'state' => 'SC',
            'base_url' => "https://{$domain}",
            'source' => 'google_places',
            'automatic_classification' => 'candidate',
            'review_state' => 'approved',
            'reviewed_by' => $this->admin->id,
            'reviewed_at' => now(),
            'review_reason' => 'Existing human decision must be preserved.',
            'metadata' => [],
        ]);
    }
}
