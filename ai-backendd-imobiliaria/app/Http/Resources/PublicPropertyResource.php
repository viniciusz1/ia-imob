<?php

namespace App\Http\Resources;

use App\Http\Resources\Concerns\PublicPropertyPresentation;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Summary payload for a Published Property on a White-Label Site search/list.
 * Whitelists safe fields only (ADR-0002).
 */
class PublicPropertyResource extends JsonResource
{
    use PublicPropertyPresentation;

    public function toArray(Request $request): array
    {
        return [
            'slug' => $this->slug,
            'reference_code' => $this->reference_code,
            'title' => $this->title,
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
            ],
            'location' => $this->publicLocation(),
            'pricing' => $this->publicPricing(),
            'cover_image' => $this->coverImageUrl(),
        ];
    }
}
