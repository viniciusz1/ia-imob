<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PropertyResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'reference_code' => $this->reference_code,
            'title' => $this->title,
            'description' => $this->description,
            'property_type' => $this->property_type,
            'purpose' => $this->purpose,
            'status' => $this->status,

            // Location
            'location' => [
                'zip_code' => $this->zip_code,
                'state' => $this->state,
                'city' => $this->city,
                'neighborhood' => $this->neighborhood,
                'street' => $this->street,
                'number' => $this->number,
                'complement' => $this->complement,
                'latitude' => $this->latitude,
                'longitude' => $this->longitude,
                'show_exact_address' => (bool) $this->show_exact_address,
            ],

            // Pricing
            'pricing' => [
                'sale_price' => $this->sale_price,
                'rent_price' => $this->rent_price,
                'property_tax' => $this->property_tax,
                'condo_fee' => $this->condo_fee,
                'accepts_financing' => (bool) $this->accepts_financing,
                'accepts_exchange' => (bool) $this->accepts_exchange,
                'show_price' => (bool) $this->show_price,
            ],

            // Characteristics
            'characteristics' => [
                'usable_area' => $this->usable_area,
                'total_area' => $this->total_area,
                'bedrooms' => $this->bedrooms,
                'suites' => $this->suites,
                'bathrooms' => $this->bathrooms,
                'garage_spaces' => $this->garage_spaces,
                'floor_number' => $this->floor_number,
                'total_floors' => $this->total_floors,
                'build_year' => $this->build_year,
            ],

            // Media
            'media' => [
                'video_url' => $this->video_url,
                'virtual_tour_url' => $this->virtual_tour_url,
                'images' => PropertyImageResource::collection($this->whenLoaded('images')),
            ],

            // Flags
            'is_published' => (bool) $this->is_published,
            'is_highlighted' => (bool) $this->is_highlighted,

            // Management
            'management' => [
                'broker' => $this->whenLoaded('broker', function () {
                    return [
                        'id' => $this->broker->id,
                        'name' => $this->broker->name,
                    ];
                }),
                'owner' => $this->whenLoaded('owner', function () {
                    return [
                        'id' => $this->owner->id,
                        'name' => $this->owner->name,
                    ];
                }),
                'internal_notes' => $this->internal_notes,
                'has_exclusive_right' => (bool) $this->has_exclusive_right,
                'exclusive_right_expiration_date' => $this->exclusive_right_expiration_date ? $this->exclusive_right_expiration_date->format('Y-m-d') : null,
                'keys_location' => $this->keys_location,
            ],

            'features' => FeatureResource::collection($this->whenLoaded('features')),

            'created_at' => $this->created_at->toIso8601String(),
            'updated_at' => $this->updated_at->toIso8601String(),
        ];
    }
}
