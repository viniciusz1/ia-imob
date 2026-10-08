<?php

namespace App\Http\Controllers\Api\Analytics;

use App\Http\Controllers\Controller;
use App\Http\Requests\Analytics\MarketAnalyticsFilterRequest;
use App\Services\Analytics\MarketAnalyticsMeta;
use App\Services\Analytics\MarketPricingService;
use Illuminate\Http\JsonResponse;

class MarketPricingController extends Controller
{
    public function __construct(
        private readonly MarketPricingService $pricing,
        private readonly MarketAnalyticsMeta $meta,
    ) {}

    public function __invoke(MarketAnalyticsFilterRequest $request): JsonResponse
    {
        $filters = $request->filters();

        return response()->json([
            'data' => $this->pricing->handle($filters),
            'meta' => $this->meta->for($filters),
        ]);
    }
}
