<?php

namespace App\Http\Controllers\Api\Crawler;

use App\Http\Controllers\Controller;
use App\Models\Crawler\CrawlAgency;
use App\Services\Auction\AuctionRecordIngestor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AuctionIngestionController extends Controller
{
    public function store(Request $request, AuctionRecordIngestor $ingestor): JsonResponse
    {
        $data = $request->validate([
            'domain' => 'required|string|in:auction',
            'crawl_agency_id' => ['required', Rule::exists(CrawlAgency::class, 'id')],
            ...AuctionRecordIngestor::rules(),
        ]);

        $event = $ingestor->ingest($data, crawlAgencyId: (int) $data['crawl_agency_id']);

        return response()->json(['status' => 'success', 'event_id' => $event->id]);
    }
}
