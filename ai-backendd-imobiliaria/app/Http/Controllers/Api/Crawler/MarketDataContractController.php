<?php

namespace App\Http\Controllers\Api\Crawler;

use App\Http\Controllers\Controller;
use App\Http\Requests\Crawler\StoreMarketDataContractRequest;
use App\Http\Resources\Crawler\MarketDataContractResource;
use App\Models\Crawler\MarketDataContractVersion;
use App\Services\Crawler\MarketDataContractService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class MarketDataContractController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return MarketDataContractResource::collection(
            MarketDataContractVersion::query()->orderByDesc('version')->get()
        );
    }

    public function store(StoreMarketDataContractRequest $request, MarketDataContractService $service): MarketDataContractResource
    {
        return new MarketDataContractResource(
            $service->createDraft($request->validated('fields'), $request->user())
        );
    }

    public function validateContract(
        MarketDataContractVersion $marketDataContract,
        MarketDataContractService $service,
    ): MarketDataContractResource {
        return new MarketDataContractResource($service->validate($marketDataContract));
    }

    public function activate(
        Request $request,
        MarketDataContractVersion $marketDataContract,
        MarketDataContractService $service,
    ): MarketDataContractResource {
        return new MarketDataContractResource($service->activate($marketDataContract, $request->user()));
    }
}
