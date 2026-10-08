<?php

namespace App\Http\Controllers\Api\Analytics;

use App\Http\Controllers\Controller;
use App\Http\Requests\Analytics\MarketAnalyticsFilterRequest;
use App\Services\Analytics\MarketAnalyticsMeta;
use App\Services\Analytics\MarketRankingsService;
use Illuminate\Http\JsonResponse;

class MarketRankingsController extends Controller
{
    public function __construct(
        private readonly MarketRankingsService $rankings,
        private readonly MarketAnalyticsMeta $meta,
    ) {}

    public function __invoke(MarketAnalyticsFilterRequest $request): JsonResponse
    {
        $filters = $request->filters();

        return response()->json([
            'data' => $this->rankings->handle($filters, $request->limit()),
            'meta' => $this->meta->for($filters),
        ]);
    }
}
