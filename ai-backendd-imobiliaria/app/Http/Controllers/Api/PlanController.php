<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\SubscriptionPlanResource;
use App\Models\SubscriptionPlan;
use Illuminate\Http\JsonResponse;

class PlanController extends Controller
{
    /**
     * Get all active subscription plans.
     */
    public function index(): JsonResponse
    {
        $plans = SubscriptionPlan::where('is_active', true)->get();

        return response()->json(
            SubscriptionPlanResource::collection($plans)
        );
    }
}
