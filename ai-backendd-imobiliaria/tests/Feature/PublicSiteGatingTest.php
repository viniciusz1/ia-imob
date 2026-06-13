<?php

namespace Tests\Feature;

use App\Models\SubscriptionPlan;
use App\Models\Tenant;
use App\Models\TenantSubscription;
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

    private function tenantWithSubscriptionStatus(?string $status): Tenant
    {
        $tenant = Tenant::factory()->create(['slug' => 'acme']);
        $owner = User::factory()->for($tenant)->create();
        $tenant->update(['owner_user_id' => $owner->id]);

        if ($status !== null) {
            TenantSubscription::create([
                'tenant_id' => $tenant->id,
                'plan_id' => SubscriptionPlan::first()->id,
                'billing_type' => 'PIX',
                'status' => $status,
            ]);
        }

        return $tenant;
    }

    public function test_serves_an_active_tenant(): void
    {
        $this->tenantWithSubscriptionStatus('active');

        $this->getJson('http://acme.localhost/api/public/properties')->assertOk();
    }

    public function test_serves_a_tenant_without_a_subscription_as_preview(): void
    {
        $this->tenantWithSubscriptionStatus(null);

        $this->getJson('http://acme.localhost/api/public/properties')->assertOk();
    }

    public function test_returns_503_when_subscription_is_inactive(): void
    {
        $this->tenantWithSubscriptionStatus('inactive');

        $this->getJson('http://acme.localhost/api/public/properties')->assertStatus(503);
    }

    public function test_returns_503_when_subscription_is_expired(): void
    {
        $this->tenantWithSubscriptionStatus('expired');

        $this->getJson('http://acme.localhost/api/public/properties')->assertStatus(503);
    }

    public function test_returns_404_when_subscription_is_cancelled(): void
    {
        $this->tenantWithSubscriptionStatus('cancelled');

        $this->getJson('http://acme.localhost/api/public/properties')->assertStatus(404);
    }

    public function test_resolves_a_tenant_by_custom_domain(): void
    {
        $tenant = Tenant::factory()->create(['slug' => 'acme']);
        $tenant->domains()->create(['hostname' => 'www.imobacme.com.br', 'is_primary' => true]);

        $this->getJson('http://www.imobacme.com.br/api/public/properties')->assertOk();
    }
}
