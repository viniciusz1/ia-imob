<?php

namespace Tests\Feature\Crawler;

use App\Models\Crawler\CrawlerOperation;
use App\Models\Crawler\Prospect;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ProspectApiTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
        $this->admin = User::query()->where('email', 'platform@imobiliaria.com')->firstOrFail();
    }

    public function test_operator_queues_single_city_prospecting_without_exposing_gateway_secret(): void
    {
        $operation = $this->actingAs($this->admin)->postJson('/api/v1/admin/crawler/prospecting-operations', [
            'city' => 'Joinville',
            'state' => 'SC',
        ])->assertCreated()
            ->assertJsonPath('data.type', 'prospecting')
            ->assertJsonPath('data.plan.city', 'Joinville')
            ->json('data');

        $this->assertArrayNotHasKey('api_key', $operation['plan']);
        $this->assertStringNotContainsString('secret', json_encode($operation));

        Role::query()->where('name', 'Platform Admin')->firstOrFail()->revokePermissionTo('crawler.prospects.manage');
        $this->actingAs($this->admin)->postJson('/api/v1/admin/crawler/prospecting-operations', [
            'city' => 'Blumenau', 'state' => 'SC',
        ])->assertForbidden();
    }

    public function test_review_filters_and_preserves_automatic_classification_with_human_decision(): void
    {
        $prospect = $this->prospect('review.example.com');

        $this->actingAs($this->admin)->postJson("/api/v1/admin/crawler/prospects/{$prospect->id}/decision", [
            'decision' => 'approved',
            'reason' => 'Website belongs to a local real estate agency.',
        ])->assertOk()
            ->assertJsonPath('data.review_state', 'approved')
            ->assertJsonPath('data.automatic_classification', 'candidate');

        $this->actingAs($this->admin)
            ->getJson('/api/v1/admin/crawler/prospects?city=Joinville&review_state=approved')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.review_reason', 'Website belongs to a local real estate agency.');

        $this->assertNotNull($prospect->refresh()->reviewed_at);
        $this->assertSame($this->admin->id, $prospect->reviewed_by);
    }

    public function test_approved_prospect_promotes_transactionally_to_onboarding_without_external_operations(): void
    {
        $prospect = $this->prospect('promote.example.com', 'approved');
        $operationCount = CrawlerOperation::query()->count();

        $promoted = $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/prospects/{$prospect->id}/promote")
            ->assertCreated()
            ->assertJsonPath('data.crawl_agency.lifecycle_state', 'onboarding')
            ->assertJsonPath('data.onboarding_plan.status', 'draft')
            ->json('data');

        $this->assertSame($operationCount, CrawlerOperation::query()->count());
        $this->assertDatabaseHas('crawler.crawl_agencies', ['root_domain' => 'promote.example.com']);
        $this->assertDatabaseHas('crawler.onboarding_plans', ['prospect_id' => $prospect->id]);

        $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/crawler/prospects/{$prospect->id}/promote")
            ->assertOk()
            ->assertJsonPath('data.crawl_agency.id', $promoted['crawl_agency']['id']);
        $this->assertDatabaseCount('crawler.crawl_agencies', 1);
    }

    private function prospect(string $domain, string $reviewState = 'pending'): Prospect
    {
        return Prospect::query()->create([
            'root_domain' => $domain,
            'google_place_id' => "place-{$domain}",
            'name' => "Imobiliária {$domain}",
            'city' => 'Joinville',
            'state' => 'SC',
            'base_url' => "https://{$domain}",
            'source' => 'google_places',
            'automatic_classification' => 'candidate',
            'automatic_reason' => null,
            'review_state' => $reviewState,
            'reviewed_by' => $reviewState === 'approved' ? $this->admin->id : null,
            'reviewed_at' => $reviewState === 'approved' ? now() : null,
            'review_reason' => $reviewState === 'approved' ? 'Pre-approved for promotion test.' : null,
            'metadata' => [],
        ]);
    }
}
