<?php

namespace App\Http\Controllers\Api\Analytics;

use App\Http\Controllers\Controller;
use App\Http\Requests\Analytics\MarketAnalyticsFilterRequest;
use App\Services\Analytics\ValuationAnalyticsService;
use Illuminate\Http\JsonResponse;

class ValuationAnalyticsController extends Controller
{
    public function __construct(private readonly ValuationAnalyticsService $valuations) {}

    public function __invoke(MarketAnalyticsFilterRequest $request): JsonResponse
    {
        $filters = $request->filters();

        return response()->json([
            'data' => $this->valuations->handle($filters, $request->limit()),
            'meta' => $this->valuations->meta($filters),
        ]);
    }
}
