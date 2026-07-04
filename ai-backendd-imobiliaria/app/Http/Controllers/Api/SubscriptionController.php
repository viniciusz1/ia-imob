<?php

namespace App\Http\Controllers\Api;

use App\Enums\BillingType;
use App\Enums\SubscriptionStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\SubscriptionStoreRequest;
use App\Http\Resources\AgencySubscriptionResource;
use App\Models\SubscriptionPlan;
use App\Services\SubscriptionService;
use Illuminate\Http\JsonResponse;

class SubscriptionController extends Controller
{
    public function __construct(private SubscriptionService $service) {}

    /**
     * Get the current active subscription.
     */
    public function current(): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = auth()->user();

        // Check permission if needed, but usually any user can view their sub
        if (! $user->can('subscriptions.view')) {
            abort(403);
        }

        $subscription = $user->subscriptions()
            ->with('plan')
            ->whereIn('status', [SubscriptionStatus::Active, SubscriptionStatus::Pending])
            ->first();

        if (! $subscription) {
            return response()->json(null);
        }

        return response()->json(new AgencySubscriptionResource($subscription));
    }

    /**
     * Subscribe to a plan.
     */
    public function store(SubscriptionStoreRequest $request): JsonResponse
    {
        $plan = SubscriptionPlan::where('slug', $request->plan_slug)->firstOrFail();

        $subscription = $this->service->subscribe(
            user: $request->user(),
            plan: $plan,
            billingType: BillingType::from($request->billing_type)
        );

        $subscription->load('plan');

        return response()->json(new AgencySubscriptionResource($subscription), 201);
    }

    /**
     * Cancel the active subscription.
     */
    public function destroy(int $id): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = auth()->user();

        if (! $user->can('subscriptions.manage')) {
            abort(403);
        }

        $subscription = $user->subscriptions()->findOrFail($id);

        $this->service->cancel($subscription);

        return response()->json(['message' => 'Assinatura cancelada com sucesso.']);
    }
}
