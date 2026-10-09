<?php

namespace App\Http\Controllers\Api\Crawler;

use App\Enums\Auction\AuctionCrawlRunStatus;
use App\Http\Controllers\Controller;
use App\Models\AuctionCrawlRun;
use App\Services\Auction\AuctionCrawlRunService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuctionWorkerController extends Controller
{
    public function __construct(private readonly AuctionCrawlRunService $service) {}

    public function claim(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'worker_key' => 'required|string',
        ]);

        $run = $this->service->claim($validated['worker_key']);

        return response()->json(['data' => $run]);
    }

    public function progress(Request $request, AuctionCrawlRun $run): JsonResponse
    {
        $validated = $request->validate([
            'stage' => 'nullable|string',
            'sitemaps_read' => 'nullable|integer',
            'urls_found' => 'nullable|integer',
            'urls_total' => 'nullable|integer',
            'processed' => 'nullable|integer',
            'failed' => 'nullable|integer',
            'log' => 'nullable|array',
        ]);

        $run = $this->service->progress($run, $validated);

        return response()->json(['data' => $run]);
    }

    public function records(Request $request, AuctionCrawlRun $run): JsonResponse
    {
        $validated = $request->validate([
            'records' => 'required|array',
        ]);

        $result = $this->service->ingestRecords($run, $validated['records']);

        return response()->json(['data' => $result]);
    }

    public function finish(Request $request, AuctionCrawlRun $run): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|string|in:succeeded,failed,cancelled',
            'error' => 'nullable|string',
        ]);

        $status = AuctionCrawlRunStatus::from($validated['status']);
        $run = $this->service->finish($run, $status, $validated['error'] ?? null);

        return response()->json(['data' => $run]);
    }
}
