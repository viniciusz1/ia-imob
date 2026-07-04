<?php

namespace Tests\Feature;

use App\Models\SubscriptionPlan;
use App\Models\AgencySubscription;
use App\Models\User;
use App\Services\AsaasService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SubscriptionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\PermissionSeeder::class);
        $this->seed(\Database\Seeders\SystemEnumSeeder::class);
        $this->app[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Prevent real HTTP requests during testing
        Http::preventStrayRequests();
    }

    public function test_can_list_plans(): void
    {
        $this->seed(\Database\Seeders\SubscriptionPlanSeeder::class);

        $response = $this->getJson('/api/plans');

        $response->assertStatus(200)
            ->assertJsonCount(3)
            ->assertJsonPath('0.slug', 'monthly')
            ->assertJsonPath('1.slug', 'semiannual')
            ->assertJsonPath('2.slug', 'annual');
    }

    public function test_user_cannot_create_subscription_without_permission(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->seed(\Database\Seeders\SubscriptionPlanSeeder::class);

        $response = $this->postJson('/api/subscriptions', [
            'plan_slug' => 'monthly',
            'billing_type' => 'PIX',
        ]);

        $response->assertStatus(403);
    }

    public function test_user_can_create_subscription_with_permission(): void
    {
        $user = User::factory()->create();
        $user->givePermissionTo('subscriptions.manage');
        Sanctum::actingAs($user);

        $this->seed(\Database\Seeders\SubscriptionPlanSeeder::class);

        // Mock AsaasService responses
        $mockAsaas = $this->mock(AsaasService::class);

        $mockAsaas->shouldReceive('createCustomer')->once()->andReturn(['id' => 'cus_123']);
        $mockAsaas->shouldReceive('createSubscription')->once()->andReturn([
            'id' => 'sub_123',
            'nextDueDate' => Carbon::today()->format('Y-m-d'),
        ]);

        $response = $this->postJson('/api/subscriptions', [
            'plan_slug' => 'monthly',
            'billing_type' => 'PIX',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('plan.slug', 'monthly')
            ->assertJsonPath('billing_type', 'PIX')
            ->assertJsonPath('status', 'pending');

        $this->assertDatabaseHas('agency_subscriptions', [
            'user_id' => $user->id,
            'asaas_subscription_id' => 'sub_123',
            'status' => 'pending',
        ]);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'asaas_customer_id' => 'cus_123',
        ]);
    }

    public function test_user_can_cancel_subscription(): void
    {
        $user = User::factory()->create();
        $user->givePermissionTo('subscriptions.manage');
        Sanctum::actingAs($user);

        $this->seed(\Database\Seeders\SubscriptionPlanSeeder::class);
        $plan = SubscriptionPlan::where('slug', 'monthly')->first();

        $subscription = AgencySubscription::create([
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'asaas_customer_id' => 'cus_123',
            'asaas_subscription_id' => 'sub_123',
            'billing_type' => 'PIX',
            'status' => 'active',
            'next_due_date' => Carbon::today(),
        ]);

        $mockAsaas = $this->mock(AsaasService::class);
        $mockAsaas->shouldReceive('cancelSubscription')->once()->with('sub_123')->andReturn(['status' => 'DELETED']);

        $response = $this->deleteJson('/api/subscriptions/'.$subscription->id);

        $response->assertStatus(200);

        $this->assertDatabaseHas('agency_subscriptions', [
            'id' => $subscription->id,
            'status' => 'cancelled',
        ]);
    }

    public function test_asaas_webhook_marks_payment_confirmed(): void
    {
        $user = User::factory()->create();

        $this->seed(\Database\Seeders\SubscriptionPlanSeeder::class);
        $plan = SubscriptionPlan::where('slug', 'monthly')->first();

        $subscription = AgencySubscription::create([
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'asaas_customer_id' => 'cus_123',
            'asaas_subscription_id' => 'sub_123',
            'billing_type' => 'PIX',
            'status' => 'pending',
            'next_due_date' => Carbon::today(),
        ]);

        config(['services.asaas.webhook_token' => 'secret_token']);

        $payload = [
            'event' => 'PAYMENT_CONFIRMED',
            'payment' => [
                'externalReference' => (string) $user->id,
                'dueDate' => Carbon::tomorrow()->format('Y-m-d'),
            ],
        ];

        $response = $this->postJson('/api/webhooks/asaas', $payload, [
            'asaas-access-token' => 'secret_token',
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('agency_subscriptions', [
            'id' => $subscription->id,
            'status' => 'active',
            'next_due_date' => Carbon::tomorrow()->format('Y-m-d'),
        ]);
    }

    public function test_asaas_webhook_rejects_invalid_token(): void
    {
        config(['services.asaas.webhook_token' => 'secret_token']);

        $response = $this->postJson('/api/webhooks/asaas', [], [
            'asaas-access-token' => 'invalid_token',
        ]);

        $response->assertStatus(401);
    }
}
