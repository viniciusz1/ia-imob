<?php

namespace App\Http\Controllers\Api\Analytics;

use App\Http\Controllers\Controller;
use App\Http\Requests\Analytics\MarketAnalyticsFilterRequest;
use App\Services\Analytics\AuctionAnalyticsService;
use Illuminate\Http\JsonResponse;

class AuctionAnalyticsController extends Controller
{
    public function __construct(private readonly AuctionAnalyticsService $auctions) {}

    public function __invoke(MarketAnalyticsFilterRequest $request): JsonResponse
    {
        $filters = $request->filters();

        return response()->json([
            'data' => $this->auctions->handle($filters, $request->limit()),
            'meta' => $this->auctions->meta($filters),
        ]);
    }
}
