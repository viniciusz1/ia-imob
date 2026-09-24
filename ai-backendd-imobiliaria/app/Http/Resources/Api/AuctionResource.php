<?php

namespace App\Http\Resources\Api;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AuctionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $property = $this->property;
        $event = $this->event;
        $currentRound = $this->currentRound;
        
        $images = [];
        $noticeUrl = null;
        
        if ($this->relationLoaded('evidences')) {
            $images = $this->evidences->where('kind', 'photo')->pluck('url')->toArray();
            $noticeUrl = $this->evidences->where('kind', 'notice')->first()?->url;
        }

        return [
            'id' => $this->id,
            'lot_number' => $this->lot_number,
            'title' => $property->title ?? $event->title,
            'description' => $property->description,
            'property_type' => $property->property_type,
            'canonical_url' => $this->canonical_url ?? $event->canonical_url,
            
            'address' => $property->address,
            'neighborhood' => $property->neighborhood,
            'city' => $property->city,
            'state' => $property->state,
            'built_area_m2' => $property->built_area_m2,
            'land_area_m2' => $property->land_area_m2,
            'occupancy_status' => $property->occupancy_status,
            
            'event' => [
                'title' => $event->title,
                'sale_modality' => $event->sale_modality,
                'status' => $event->status,
                'auctioneer_name' => $event->auctioneer_name,
            ],
            
            'round' => $currentRound ? [
                'round_number' => $currentRound->round_number,
                'starts_at' => $currentRound->starts_at?->toIso8601String(),
                'ends_at' => $currentRound->ends_at?->toIso8601String(),
                'minimum_bid' => $currentRound->minimum_bid,
                'appraisal_value' => $currentRound->appraisal_value,
                'status' => $currentRound->status,
            ] : null,
            
            'images' => $images,
            'notice_url' => $noticeUrl,
        ];
    }
}
