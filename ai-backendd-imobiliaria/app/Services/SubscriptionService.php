<?php

namespace App\Services;

use App\Models\User;
use App\Models\SubscriptionPlan;
use App\Models\TenantSubscription;
use App\Enums\SubscriptionStatus;
use App\Enums\BillingType;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class SubscriptionService
{
    public function __construct(private AsaasService $asaas) {}

    /**
     * Creates or retrieves the Customer in Asaas and creates the subscription.
     * Returns the saved TenantSubscription model.
     */
    public function subscribe(
        User $user,
        SubscriptionPlan $plan,
        BillingType $billingType
    ): TenantSubscription {
        return DB::transaction(function () use ($user, $plan, $billingType) {

            // 1. Create or retrieve Customer in Asaas
            $asaasCustomerId = $user->asaas_customer_id;

            if (!$asaasCustomerId) {
                $customer = $this->asaas->createCustomer([
                    'name'              => $user->name,
                    'cpfCnpj'           => $user->creci ?? '00000000000', // Asaas requires cpfCnpj. Replace with real CPF/CNPJ if available
                    'email'             => $user->email,
                    'externalReference' => (string) $user->id,
                ]);
                $asaasCustomerId = $customer['id'];
                $user->update(['asaas_customer_id' => $asaasCustomerId]);
            }

            // 2. Create Subscription in Asaas
            $subscription = $this->asaas->createSubscription([
                'customer'          => $asaasCustomerId,
                'billingType'       => $billingType->value,
                'value'             => $plan->total_price,
                'nextDueDate'       => Carbon::today()->format('Y-m-d'),
                'cycle'             => $plan->asaas_cycle->value,
                'description'       => "ia-imob — {$plan->name}",
                'externalReference' => (string) $user->id,
            ]);

            // 3. Persist locally
            return TenantSubscription::create([
                'user_id'               => $user->id,
                'plan_id'               => $plan->id,
                'asaas_customer_id'     => $asaasCustomerId,
                'asaas_subscription_id' => $subscription['id'],
                'billing_type'          => $billingType->value,
                'status'                => SubscriptionStatus::Pending->value, // activated by webhook
                'next_due_date'         => $subscription['nextDueDate'],
            ]);
        });
    }

    /** Cancels the subscription in Asaas and updates the local status. */
    public function cancel(TenantSubscription $tenantSubscription): void
    {
        $this->asaas->cancelSubscription($tenantSubscription->asaas_subscription_id);

        $tenantSubscription->update([
            'status'  => SubscriptionStatus::Cancelled->value,
            'ends_at' => Carbon::now(),
        ]);
    }
}
