<?php

namespace App\Http\Controllers\Api\Crawler;

use App\Http\Controllers\Controller;
use App\Http\Requests\Crawler\ProspectDecisionRequest;
use App\Http\Requests\Crawler\QueueProspectingRequest;
use App\Http\Resources\Crawler\CrawlAgencyResource;
use App\Http\Resources\Crawler\CrawlerOperationResource;
use App\Http\Resources\Crawler\ProspectResource;
use App\Models\Crawler\Prospect;
use App\Services\Crawler\ProspectingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ProspectController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        return ProspectResource::collection(
            Prospect::query()
                ->when($request->filled('city'), fn ($query) => $query->where('city', $request->query('city')))
                ->when($request->filled('state'), fn ($query) => $query->where('state', strtoupper((string) $request->query('state'))))
                ->when($request->filled('review_state'), fn ($query) => $query->where('review_state', $request->query('review_state')))
                ->when($request->filled('automatic_classification'), fn ($query) => $query->where('automatic_classification', $request->query('automatic_classification')))
                ->latest('id')
                ->paginate()
        );
    }

    public function queue(QueueProspectingRequest $request, ProspectingService $service): CrawlerOperationResource
    {
        return new CrawlerOperationResource($service->queue(
            $request->validated('city'),
            $request->validated('state'),
            $request->user(),
        ));
    }

    public function decide(
        ProspectDecisionRequest $request,
        Prospect $prospect,
        ProspectingService $service,
    ): ProspectResource {
        return new ProspectResource($service->decide(
            $prospect,
            $request->validated('decision'),
            $request->validated('reason'),
            $request->user(),
        ));
    }

    public function promote(Request $request, Prospect $prospect, ProspectingService $service): JsonResponse
    {
        $result = $service->promote($prospect, $request->user());

        return response()->json([
            'data' => [
                'crawl_agency' => (new CrawlAgencyResource($result['crawl_agency']))->resolve($request),
                'onboarding_plan' => $result['onboarding_plan'],
            ],
        ], $result['created'] ? 201 : 200);
    }
}
