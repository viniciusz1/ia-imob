<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuctionEventProperty;
use App\Http\Resources\Api\AuctionResource;
use Illuminate\Http\Request;

class AuctionController extends Controller
{
    public function index(Request $request)
    {
        $query = AuctionEventProperty::with(['event', 'property', 'currentRound', 'evidences'])
            ->whereHas('event', function ($q) {
                // $q->where('status', 'open'); // Can filter active ones later
            });

        // Search text
        if ($search = $request->query('search')) {
            $query->whereHas('property', function ($q) use ($search) {
                $q->where('title', 'ilike', "%{$search}%")
                  ->orWhere('city', 'ilike', "%{$search}%")
                  ->orWhere('neighborhood', 'ilike', "%{$search}%");
            });
        }

        // Filter by Modality
        if ($modality = $request->query('modality')) {
            $query->whereHas('event', function ($q) use ($modality) {
                $q->where('sale_modality', $modality);
            });
        }
        
        // Filter by City
        if ($city = $request->query('city')) {
            $query->whereHas('property', function ($q) use ($city) {
                $q->where('city', $city);
            });
        }

        // Sort by
        $sortBy = $request->query('sort', 'created_at');
        $sortDir = $request->query('direction', 'desc');

        if ($sortBy === 'price') {
            // Sort by current round's minimum bid
            // Requires joining or subquery, for simplicity we sort by ID for now 
            // or use a subselect for minimum_bid.
            // Let's keep it simple for the MVP:
            $query->orderBy('id', $sortDir);
        } else {
            $query->orderBy('id', $sortDir);
        }

        $perPage = $request->query('per_page', 12);
        $auctions = $query->paginate($perPage);

        return AuctionResource::collection($auctions);
    }
}
