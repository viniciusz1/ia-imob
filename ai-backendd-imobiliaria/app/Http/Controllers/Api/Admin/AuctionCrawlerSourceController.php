<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuctionCrawlerSource;
use App\Services\Auction\AuctionCrawlRunService;
use Illuminate\Http\Request;

class AuctionCrawlerSourceController extends Controller
{
    public function __construct(private readonly AuctionCrawlRunService $crawlRunService) {}

    public function index()
    {
        $sources = AuctionCrawlerSource::orderBy('id', 'desc')->get();
        return response()->json(['data' => $sources]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|string|in:sitemap,api,html',
            'config' => 'required|array',
        ]);

        $source = AuctionCrawlerSource::create([
            'name' => $validated['name'],
            'type' => $validated['type'],
            'config' => $validated['config'],
            'is_active' => true,
        ]);

        return response()->json(['data' => $source], 201);
    }

    public function dispatchOperation(Request $request, $id)
    {
        $source = AuctionCrawlerSource::findOrFail($id);
        
        $run = $this->crawlRunService->queue($source, $request->user());

        return response()->json([
            'data' => $source,
            'run' => $run,
            'message' => 'Crawler operation dispatched to queue successfully.'
        ]);
    }

    public function runs($id)
    {
        $source = AuctionCrawlerSource::findOrFail($id);
        $runs = $source->runs()->orderBy('id', 'desc')->take(10)->get();
        return response()->json(['data' => $runs]);
    }
}
