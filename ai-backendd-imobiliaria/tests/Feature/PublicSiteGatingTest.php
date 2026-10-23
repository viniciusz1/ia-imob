<?php

namespace Tests\Feature;

use App\Models\Agency;
use App\Models\AgencySubscription;
use App\Models\SubscriptionPlan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicSiteGatingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\SubscriptionPlanSeeder::class);
    }

    private function agencyWithSubscriptionStatus(?string $status): Agency
    {
        $agency = Agency::factory()->create(['slug' => 'acme']);
        $owner = User::factory()->for($agency)->create();
        $agency->update(['owner_user_id' => $owner->id]);

        if ($status !== null) {
            AgencySubscription::create([
                'agency_id' => $agency->id,
                'plan_id' => SubscriptionPlan::first()->id,
                'billing_type' => 'PIX',
                'status' => $status,
            ]);
        }

        return $agency;
    }

    public function test_serves_an_active_agency(): void
    {
        $this->agencyWithSubscriptionStatus('active');

        $this->getJson('http://acme.localhost/api/public/properties')->assertOk();
    }

    public function test_serves_a_agency_without_a_subscription_as_preview(): void
    {
        $this->agencyWithSubscriptionStatus(null);

        $this->getJson('http://acme.localhost/api/public/properties')->assertOk();
    }

    public function test_returns_503_when_subscription_is_inactive(): void
    {
        $this->agencyWithSubscriptionStatus('inactive');

        $this->getJson('http://acme.localhost/api/public/properties')->assertStatus(503);
    }

    public function test_returns_503_when_subscription_is_expired(): void
    {
        $this->agencyWithSubscriptionStatus('expired');

        $this->getJson('http://acme.localhost/api/public/properties')->assertStatus(503);
    }

    public function test_returns_404_when_subscription_is_cancelled(): void
    {
        $this->agencyWithSubscriptionStatus('cancelled');

        $this->getJson('http://acme.localhost/api/public/properties')->assertStatus(404);
    }

    public function test_resolves_a_agency_by_custom_domain(): void
    {
        $agency = Agency::factory()->create(['slug' => 'acme']);
        $agency->domains()->create(['hostname' => 'www.imobacme.com.br', 'is_primary' => true]);

        $this->getJson('http://www.imobacme.com.br/api/public/properties')->assertOk();
    }
}
