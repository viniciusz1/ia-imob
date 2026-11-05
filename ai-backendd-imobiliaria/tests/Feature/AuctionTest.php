<?php

namespace Tests\Feature;

use App\Jobs\ExpireFinishedAuctionsJob;
use App\Models\AuctionEvent;
use App\Models\AuctionEventProperty;
use App\Models\AuctionProperty;
use App\Models\AuctionRound;
use App\Models\Crawler\CrawlAgency;
use App\Models\User;
use App\Services\Auction\AuctionLifecycleService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuctionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\PermissionSeeder::class);
        $this->seed(\Database\Seeders\SystemEnumSeeder::class);
        $this->seed(\Database\Seeders\FeatureSeeder::class);

        $this->app[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
    }

    private function createAuctionItem(array $eventOverrides = [], array $propertyOverrides = [], array $roundOverrides = []): AuctionEventProperty
    {
        $agency = CrawlAgency::query()->firstOrCreate(
            ['root_domain' => 'test-agency.com'],
            ['name' => 'Test Agency', 'slug' => 'test-agency', 'base_url' => 'https://test-agency.com']
        );

        $event = AuctionEvent::create(array_merge([
            'crawl_agency_id' => $agency->id,
            'external_key' => 'EVT-'.uniqid(),
            'title' => 'Leilão Teste Judicial',
            'sale_modality' => 'judicial',
            'status' => 'open',
            'auctioneer_name' => 'Leiloeiro Oficial',
        ], $eventOverrides));

        $property = AuctionProperty::create(array_merge([
            'property_key' => 'PROP-'.uniqid(),
            'property_type' => 'house',
            'title' => 'Casa em Jaraguá do Sul',
            'city' => 'Jaraguá do Sul',
            'state' => 'SC',
            'neighborhood' => 'Centro',
        ], $propertyOverrides));

        $eventProperty = AuctionEventProperty::create([
            'auction_event_id' => $event->id,
            'auction_property_id' => $property->id,
            'lot_number' => '1',
            'inventory_state' => 'published',
        ]);

        $round = AuctionRound::create(array_merge([
            'auction_event_property_id' => $eventProperty->id,
            'round_number' => 1,
            'starts_at' => Carbon::now()->addDays(5),
            'ends_at' => Carbon::now()->addDays(10),
            'minimum_bid' => 250000.00,
            'appraisal_value' => 400000.00,
            'status' => 'scheduled',
        ], $roundOverrides));

        $eventProperty->update(['current_round_id' => $round->id]);

        return $eventProperty;
    }

    public function test_authenticated_user_can_list_auctions(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->createAuctionItem();

        $response = $this->getJson('/api/v1/auctions');

        $response->assertStatus(200)
            ->assertJsonStructure(['data', 'links', 'meta']);
    }

    public function test_filter_auctions_by_bid_range(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $cheap = $this->createAuctionItem([], ['title' => 'Imóvel Barato'], ['minimum_bid' => 100000.00]);
        $expensive = $this->createAuctionItem([], ['title' => 'Imóvel Caro'], ['minimum_bid' => 900000.00]);

        // Filter min_bid >= 500k
        $response = $this->getJson('/api/v1/auctions?min_bid=500000');
        $response->assertStatus(200);

        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertContains($expensive->id, $ids);
        $this->assertNotContains($cheap->id, $ids);

        // Filter max_bid <= 200k
        $responseMax = $this->getJson('/api/v1/auctions?max_bid=200000');
        $responseMax->assertStatus(200);

        $maxIds = collect($responseMax->json('data'))->pluck('id')->all();
        $this->assertContains($cheap->id, $maxIds);
        $this->assertNotContains($expensive->id, $maxIds);
    }

    public function test_filter_auctions_by_date_range(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $futureItem = $this->createAuctionItem([], ['title' => 'Leilão Futuro'], [
            'starts_at' => Carbon::parse('2026-11-10 14:00:00'),
            'ends_at' => Carbon::parse('2026-11-20 14:00:00'),
        ]);

        $farFutureItem = $this->createAuctionItem([], ['title' => 'Leilão Distante'], [
            'starts_at' => Carbon::parse('2026-12-15 14:00:00'),
            'ends_at' => Carbon::parse('2026-12-25 14:00:00'),
        ]);

        $response = $this->getJson('/api/v1/auctions?date_from=2026-11-01&date_to=2026-11-30');
        $response->assertStatus(200);

        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertContains($futureItem->id, $ids);
        $this->assertNotContains($farFutureItem->id, $ids);
    }

    public function test_lifecycle_service_and_command_expire_finished_auctions(): void
    {
        $expiredItem = $this->createAuctionItem([
            'status' => 'open',
        ], [], [
            'starts_at' => Carbon::parse('2026-09-01 10:00:00'),
            'ends_at' => Carbon::parse('2026-09-05 18:00:00'),
            'status' => 'open',
        ]);

        $activeItem = $this->createAuctionItem([
            'status' => 'open',
        ], [], [
            'starts_at' => Carbon::parse('2026-11-01 10:00:00'),
            'ends_at' => Carbon::parse('2026-11-10 18:00:00'),
            'status' => 'open',
        ]);

        $this->artisan('auctions:expire-finished', [
            '--as-of' => '2026-09-10 00:00:00',
        ])->assertSuccessful();

        $this->assertEquals('expired', $expiredItem->currentRound->fresh()->status);
        $this->assertEquals('expired', $expiredItem->fresh()->inventory_state);
        $this->assertEquals('closed', $expiredItem->event->fresh()->status);

        $this->assertEquals('open', $activeItem->currentRound->fresh()->status);
        $this->assertEquals('published', $activeItem->fresh()->inventory_state);
        $this->assertEquals('open', $activeItem->event->fresh()->status);
    }

    public function test_job_dispatches_auction_lifecycle(): void
    {
        $expiredItem = $this->createAuctionItem([
            'status' => 'open',
        ], [], [
            'starts_at' => Carbon::parse('2026-08-01 10:00:00'),
            'ends_at' => Carbon::parse('2026-08-05 18:00:00'),
            'status' => 'open',
        ]);

        $job = new ExpireFinishedAuctionsJob('2026-08-10 00:00:00');
        $job->handle(app(AuctionLifecycleService::class));

        $this->assertEquals('expired', $expiredItem->currentRound->fresh()->status);
    }

    public function test_user_can_save_and_filter_auction_alerts(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        // Store a saved filter alert for auctions
        $response = $this->postJson('/api/v1/saved-filters', [
            'name' => 'Alerta Leilões Jaraguá até 300k',
            'filters' => [
                'type' => 'auction',
                'city' => 'Jaraguá do Sul',
                'max_bid' => 300000,
                'modality' => 'judicial',
            ],
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('name', 'Alerta Leilões Jaraguá até 300k');

        // Retrieve filtered by type=auction
        $listResponse = $this->getJson('/api/v1/saved-filters?type=auction');
        $listResponse->assertStatus(200)
            ->assertJsonCount(1);
    }
}
