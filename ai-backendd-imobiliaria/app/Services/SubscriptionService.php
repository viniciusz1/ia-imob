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
                // Generate a valid mock CPF for Sandbox testing
                $n1 = rand(0, 9); $n2 = rand(0, 9); $n3 = rand(0, 9);
                $n4 = rand(0, 9); $n5 = rand(0, 9); $n6 = rand(0, 9);
                $n7 = rand(0, 9); $n8 = rand(0, 9); $n9 = rand(0, 9);
                $sum1 = $n9 * 2 + $n8 * 3 + $n7 * 4 + $n6 * 5 + $n5 * 6 + $n4 * 7 + $n3 * 8 + $n2 * 9 + $n1 * 10;
                $d1 = 11 - ($sum1 % 11);
                $d1 = $d1 >= 10 ? 0 : $d1;
                $sum2 = $d1 * 2 + $n9 * 3 + $n8 * 4 + $n7 * 5 + $n6 * 6 + $n5 * 7 + $n4 * 8 + $n3 * 9 + $n2 * 10 + $n1 * 11;
                $d2 = 11 - ($sum2 % 11);
                $d2 = $d2 >= 10 ? 0 : $d2;
                $mockCpf = "$n1$n2$n3$n4$n5$n6$n7$n8$n9$d1$d2";

                $customer = $this->asaas->createCustomer([
                    'name'              => $user->name,
                    'cpfCnpj'           => $mockCpf, // Valid mock CPF for Asaas Sandbox
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

    /** Changes the subscription plan and/or billing type in Asaas and locally. */
    public function changePlan(
        TenantSubscription $tenantSubscription,
        SubscriptionPlan $newPlan,
        BillingType $newBillingType
    ): TenantSubscription {
        return DB::transaction(function () use ($tenantSubscription, $newPlan, $newBillingType) {
            
            // 1. Update Subscription in Asaas
            // Passed updatePendingPayments => true to ensure the next immediate charge gets the new value
            $this->asaas->updateSubscription($tenantSubscription->asaas_subscription_id, [
                'billingType'           => $newBillingType->value,
                'value'                 => $newPlan->total_price,
                'cycle'                 => $newPlan->asaas_cycle->value,
                'description'           => "ia-imob — {$newPlan->name}",
                'updatePendingPayments' => true,
            ]);

            // 2. Persist locally
            $tenantSubscription->update([
                'plan_id'      => $newPlan->id,
                'billing_type' => $newBillingType->value,
            ]);

            return $tenantSubscription->refresh();
        });
    }
}
