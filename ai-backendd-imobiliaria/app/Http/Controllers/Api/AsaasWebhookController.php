<?php

namespace App\Http\Controllers\Api;

use App\Enums\SubscriptionStatus;
use App\Http\Controllers\Controller;
use App\Models\TenantSubscription;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AsaasWebhookController extends Controller
{
    /**
     * Handle Asaas Webhooks for Subscription events
     */
    public function handle(Request $request): JsonResponse
    {
        // View API token from header to validate origin
        $token = $request->header('asaas-access-token');
        if ($token !== config('services.asaas.webhook_token')) {
            abort(401, 'Unauthorized webhook');
        }

        $event   = $request->input('event');
        $payment = $request->input('payment');

        if (!$event || !$payment) {
            return response()->json(['ok' => true]); // Malformed, but return 200
        }

        // We stored the user_id as externalReference in Asaas
        $userId = $payment['externalReference'] ?? null;
        
        if (!$userId) {
            return response()->json(['ok' => true]);
        }

        // Find the active or pending local subscription
        $subscription = TenantSubscription::where('user_id', $userId)
            ->whereIn('status', [SubscriptionStatus::Pending, SubscriptionStatus::Active])
            ->latest()
            ->first();

        if (!$subscription) {
            return response()->json(['ok' => true]); // Idempotent success
        }

        match ($event) {
            'PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED' => $subscription->update([
                'status'        => SubscriptionStatus::Active->value,
                'next_due_date' => $payment['dueDate'] ?? null,
                'started_at'    => $subscription->started_at ?? Carbon::now(),
            ]),
            'PAYMENT_OVERDUE' => $subscription->update([
                'status' => SubscriptionStatus::Inactive->value,
            ]),
            'PAYMENT_REFUNDED', 'PAYMENT_DELETED' => $subscription->update([
                'status' => SubscriptionStatus::Inactive->value,
            ]),
            'SUBSCRIPTION_DELETED' => $subscription->update([
                'status'  => SubscriptionStatus::Expired->value,
                'ends_at' => Carbon::now(),
            ]),
            default => null, // Ignore other events
        };

        return response()->json(['ok' => true]);
    }
}
