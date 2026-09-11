<?php

namespace App\Http\Controllers\Api\Crawler;

use App\Http\Controllers\Controller;
use App\Models\AuctionEvent;
use App\Models\AuctionProperty;
use App\Models\AuctionEventProperty;
use App\Models\AuctionRound;
use App\Models\AuctionEvidence;
use App\Models\Crawler\CrawlAgency;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AuctionIngestionController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'domain' => 'required|string|in:auction',
            'crawl_agency_id' => ['required', \Illuminate\Validation\Rule::exists(\App\Models\Crawler\CrawlAgency::class, 'id')],
            'source.external_id' => 'required|string',
            'source.canonical_url' => 'nullable|url',
            
            'event.title' => 'required|string',
            'event.sale_modality' => 'nullable|string',
            'event.status' => 'nullable|string',
            'event.auctioneer_name' => 'nullable|string',
            'event.seller_or_court' => 'nullable|string',
            
            'property.lot_number' => 'nullable|string',
            'property.property_type' => 'nullable|string',
            'property.city' => 'nullable|string',
            'property.state' => 'nullable|string',
            'property.address' => 'nullable|string',
            'property.neighborhood' => 'nullable|string',
            'property.occupancy_status' => 'nullable|string',
            'property.built_area_m2' => 'nullable|numeric',
            'property.land_area_m2' => 'nullable|numeric',
            'property.registration_number' => 'nullable|string',
            
            'rounds' => 'nullable|array',
            'rounds.*.round_number' => 'required|integer',
            'rounds.*.starts_at' => 'nullable|date',
            'rounds.*.ends_at' => 'nullable|date',
            'rounds.*.minimum_bid' => 'nullable|numeric',
            'rounds.*.appraisal_value' => 'nullable|numeric',
            
            'evidence' => 'nullable|array',
            'evidence.*.kind' => 'required|string',
            'evidence.*.url' => 'required|url',
        ]);

        $agencyId = $data['crawl_agency_id'];
        $externalKey = $data['source']['external_id'];
        
        DB::beginTransaction();
        
        try {
            // 1. Upsert Event
            $event = AuctionEvent::updateOrCreate(
                [
                    'crawl_agency_id' => $agencyId,
                    'external_key' => $externalKey,
                ],
                [
                    'canonical_url' => $data['source']['canonical_url'] ?? null,
                    'title' => $data['event']['title'],
                    'sale_modality' => $data['event']['sale_modality'] ?? 'unknown',
                    'status' => $data['event']['status'] ?? 'unknown',
                    'auctioneer_name' => $data['event']['auctioneer_name'] ?? null,
                    'court_or_seller' => $data['event']['seller_or_court'] ?? null,
                    'source_payload' => $data,
                    'last_observed_at' => now(),
                ]
            );
            
            if (!$event->first_observed_at) {
                $event->first_observed_at = now();
                $event->save();
            }

            // 2. Upsert Property (using external key and lot number as stable identity for now)
            $lotNumber = $data['property']['lot_number'] ?? '1';
            $propertyKey = "{$agencyId}-{$externalKey}-{$lotNumber}";
            
            $property = AuctionProperty::updateOrCreate(
                ['property_key' => $propertyKey],
                [
                    'property_type' => $data['property']['property_type'] ?? 'unknown',
                    'title' => $data['property']['title'] ?? $data['event']['title'],
                    'address' => $data['property']['address'] ?? null,
                    'neighborhood' => $data['property']['neighborhood'] ?? null,
                    'city' => $data['property']['city'] ?? null,
                    'state' => $data['property']['state'] ?? null,
                    'occupancy_status' => $data['property']['occupancy_status'] ?? 'unknown',
                    'built_area_m2' => $data['property']['built_area_m2'] ?? null,
                    'land_area_m2' => $data['property']['land_area_m2'] ?? null,
                    'registration_number' => $data['property']['registration_number'] ?? null,
                    'source_payload' => $data['property'],
                ]
            );

            // 3. Upsert Event Property Pivot
            $eventProperty = AuctionEventProperty::updateOrCreate(
                [
                    'auction_event_id' => $event->id,
                    'lot_number' => $lotNumber,
                ],
                [
                    'auction_property_id' => $property->id,
                    'canonical_url' => $data['source']['canonical_url'] ?? null,
                    'observed_at' => now(),
                ]
            );

            // 4. Upsert Rounds
            if (!empty($data['rounds'])) {
                // Remove rounds not present in the payload (optional, but good practice for full state sync)
                $roundNumbers = collect($data['rounds'])->pluck('round_number')->toArray();
                AuctionRound::where('auction_event_property_id', $eventProperty->id)
                    ->whereNotIn('round_number', $roundNumbers)
                    ->delete();
                    
                $currentRoundId = null;

                foreach ($data['rounds'] as $r) {
                    $round = AuctionRound::updateOrCreate(
                        [
                            'auction_event_property_id' => $eventProperty->id,
                            'round_number' => $r['round_number'],
                        ],
                        [
                            'starts_at' => $r['starts_at'] ?? null,
                            'ends_at' => $r['ends_at'] ?? null,
                            'minimum_bid' => $r['minimum_bid'] ?? null,
                            'appraisal_value' => $r['appraisal_value'] ?? null,
                            'status' => 'scheduled',
                        ]
                    );
                    
                    if (!$currentRoundId) {
                        $currentRoundId = $round->id; // simplified logic, picks first round or logic could determine upcoming
                    }
                }
                
                $eventProperty->current_round_id = $currentRoundId;
                $eventProperty->save();
            }

            // 5. Upsert Evidences
            if (!empty($data['evidence'])) {
                // Clear old evidences for this event property
                AuctionEvidence::where('auction_event_property_id', $eventProperty->id)->delete();
                
                foreach ($data['evidence'] as $ev) {
                    AuctionEvidence::create([
                        'auction_event_property_id' => $eventProperty->id,
                        'kind' => $ev['kind'],
                        'url' => $ev['url'],
                        'captured_at' => now(),
                    ]);
                }
            }
            
            DB::commit();
            return response()->json(['status' => 'success', 'event_id' => $event->id]);
            
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }
}
