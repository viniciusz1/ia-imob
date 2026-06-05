<?php

namespace App\Http\Resources;

use App\Http\Resources\Concerns\PublicPropertyPresentation;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Full detail payload for a single Published Property on a White-Label Site.
 * Whitelists safe fields only and reuses the shared privacy gating (ADR-0002).
 */
class PublicPropertyDetailResource extends JsonResource
{
    use PublicPropertyPresentation;

    public function toArray(Request $request): array
    {
        $showPrice = (bool) $this->show_price;

        return [
            'slug' => $this->slug,
            'reference_code' => $this->reference_code,
            'title' => $this->title,
            'description' => $this->description,
            'property_type' => $this->property_type,
            'purpose' => $this->purpose,
            'is_highlighted' => (bool) $this->is_highlighted,
            'characteristics' => [
                'bedrooms' => $this->bedrooms,
                'suites' => $this->suites,
                'bathrooms' => $this->bathrooms,
                'garage_spaces' => $this->garage_spaces,
                'usable_area' => $this->usable_area,
                'total_area' => $this->total_area,
                'floor_number' => $this->floor_number,
                'total_floors' => $this->total_floors,
                'build_year' => $this->build_year,
            ],
            'location' => $this->publicLocation(),
            'pricing' => array_merge($this->publicPricing(), [
                'property_tax' => $showPrice ? $this->property_tax : null,
                'condo_fee' => $showPrice ? $this->condo_fee : null,
            ]),
            'media' => [
                'video_url' => $this->video_url,
                'virtual_tour_url' => $this->virtual_tour_url,
                'images' => $this->whenLoaded('images', fn () => $this->images->map(fn ($image) => [
                    'url' => $this->imageUrl($image->path),
                    'is_cover' => (bool) $image->is_cover,
                    'description' => $image->description,
                ])->all()),
            ],
            'features' => $this->whenLoaded('features', fn () => $this->features->pluck('name')->all()),
            'broker' => $this->whenLoaded('broker', fn () => [
                'name' => $this->broker->name,
                'creci' => $this->broker->creci,
                'phone' => $this->broker->phone,
                'avatar' => $this->broker->avatar_path ? $this->imageUrl($this->broker->avatar_path) : null,
                'facebook_link' => $this->broker->facebook_link,
                'instagram_link' => $this->broker->instagram_link,
                'description' => $this->broker->description,
            ]),
        ];
    }
}
