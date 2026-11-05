<?php

namespace App\Http\Controllers\Api;

use App\Application\Valuation\SuggestMarketPrice;
use App\Http\Controllers\Controller;
use App\Http\Requests\Valuation\SuggestMarketPriceRequest;
use Illuminate\Http\JsonResponse;

class MarketPriceSuggestionController extends Controller
{
    public function __invoke(SuggestMarketPriceRequest $request, SuggestMarketPrice $suggest): JsonResponse
    {
        return response()->json(['data' => $suggest->execute($request->valuationInput())]);
    }
}
