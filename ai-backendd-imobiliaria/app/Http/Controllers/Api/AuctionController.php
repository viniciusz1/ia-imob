<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\AuctionResource;
use App\Models\AuctionEventProperty;
use App\Models\AuctionRound;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AuctionController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = AuctionEventProperty::with(['event', 'property', 'currentRound', 'rounds', 'evidences']);

        // Search text: title, city, neighborhood, address, description, court/seller, auctioneer
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->whereHas('property', function ($pq) use ($search) {
                    $pq->where('title', 'ilike', "%{$search}%")
                        ->orWhere('city', 'ilike', "%{$search}%")
                        ->orWhere('neighborhood', 'ilike', "%{$search}%")
                        ->orWhere('address', 'ilike', "%{$search}%")
                        ->orWhere('description', 'ilike', "%{$search}%");
                })->orWhereHas('event', function ($eq) use ($search) {
                    $eq->where('title', 'ilike', "%{$search}%")
                        ->orWhere('auctioneer_name', 'ilike', "%{$search}%")
                        ->orWhere('court_or_seller', 'ilike', "%{$search}%");
                });
            });
        }

        // Filter by Modality
        if ($modality = $request->query('modality')) {
            if ($modality !== 'all') {
                $query->whereHas('event', function ($q) use ($modality) {
                    $q->where('sale_modality', $modality);
                });
            }
        }

        // Filter by City
        if ($city = $request->query('city')) {
            if ($city !== 'Todas' && $city !== 'all') {
                $query->whereHas('property', function ($q) use ($city) {
                    $q->where('city', 'ilike', $city);
                });
            }
        }

        // Filter by Property Type
        if ($propertyType = $request->query('property_type')) {
            if ($propertyType !== 'all') {
                $query->whereHas('property', function ($q) use ($propertyType) {
                    $q->where('property_type', $propertyType);
                });
            }
        }

        // Filter by Status (open, scheduled, closed, expired)
        if ($status = $request->query('status')) {
            if ($status !== 'all') {
                $query->where(function ($q) use ($status) {
                    $q->whereHas('currentRound', function ($rq) use ($status) {
                        $rq->where('status', $status);
                    })->orWhereHas('event', function ($eq) use ($status) {
                        $eq->where('status', $status);
                    })->orWhere('inventory_state', $status);
                });
            }
        }

        // Filter by Minimum Bid range (Lance Mínimo / Máximo)
        if ($request->filled('min_bid')) {
            $minBid = (float) $request->query('min_bid');
            $query->whereHas('currentRound', function ($q) use ($minBid) {
                $q->where('minimum_bid', '>=', $minBid);
            });
        }

        if ($request->filled('max_bid')) {
            $maxBid = (float) $request->query('max_bid');
            $query->whereHas('currentRound', function ($q) use ($maxBid) {
                $q->where('minimum_bid', '<=', $maxBid);
            });
        }

        // Filter by Date range (Praça / Data do Leilão)
        if ($request->filled('date_from')) {
            $dateFrom = Carbon::parse($request->query('date_from'))->startOfDay();
            $query->whereHas('currentRound', function ($q) use ($dateFrom) {
                $q->where('starts_at', '>=', $dateFrom);
            });
        }

        if ($request->filled('date_to')) {
            $dateTo = Carbon::parse($request->query('date_to'))->endOfDay();
            $query->whereHas('currentRound', function ($q) use ($dateTo) {
                $q->where(function ($sub) use ($dateTo) {
                    $sub->where(function ($s) use ($dateTo) {
                        $s->whereNotNull('ends_at')
                            ->where('ends_at', '<=', $dateTo);
                    })->orWhere(function ($s) use ($dateTo) {
                        $s->whereNull('ends_at')
                            ->where('starts_at', '<=', $dateTo);
                    });
                });
            });
        }

        // Sorting
        $sortBy = $request->query('sort', 'created_at');
        $sortDir = strtolower($request->query('direction', 'desc')) === 'asc' ? 'asc' : 'desc';

        if ($sortBy === 'price') {
            $roundPriceSubquery = AuctionRound::select('minimum_bid')
                ->whereColumn('auction_rounds.id', 'auction_event_properties.current_round_id')
                ->limit(1);
            $query->orderBy($roundPriceSubquery, $sortDir);
        } elseif ($sortBy === 'date') {
            $roundDateSubquery = AuctionRound::select('starts_at')
                ->whereColumn('auction_rounds.id', 'auction_event_properties.current_round_id')
                ->limit(1);
            $query->orderBy($roundDateSubquery, $sortDir);
        } elseif ($sortBy === 'discount') {
            $discountSubquery = AuctionRound::selectRaw('CASE WHEN appraisal_value > minimum_bid AND appraisal_value > 0 THEN ((appraisal_value - minimum_bid) / appraisal_value) * 100 ELSE 0 END')
                ->whereColumn('auction_rounds.id', 'auction_event_properties.current_round_id')
                ->limit(1);
            $query->orderBy($discountSubquery, $sortDir);
        } else {
            $query->orderBy('auction_event_properties.id', $sortDir);
        }

        $perPage = (int) $request->query('per_page', 12);
        $auctions = $query->paginate($perPage);

        return AuctionResource::collection($auctions);
    }
}
