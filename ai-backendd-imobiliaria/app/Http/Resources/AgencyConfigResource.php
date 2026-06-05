<?php

namespace App\Http\Resources;

use App\Models\SitemapAgency;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AgencyConfigResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $type = $this->resource instanceof SitemapAgency ? 'sitemap' : 'wsm';

        $base = [
            'id' => $this->id,
            'agency_type' => $type,
            'name' => $this->name,
            'domain' => $this->domain,
            'is_active' => $this->is_active,
            'expected_min_items' => $this->expected_min_items,
            'extractors' => AgencyFieldExtractorResource::collection($this->whenLoaded('extractors')),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];

        if ($type === 'sitemap') {
            return $base + [
                'sitemap_url' => $this->sitemap_url,
                'allowed_url_patterns' => $this->allowed_url_patterns,
            ];
        }

        return $base + [
            'url' => $this->url,
            'url_pagination_template' => $this->url_pagination_template,
            'total_pages_selector_type' => $this->total_pages_selector_type,
            'total_pages_selector_value' => $this->total_pages_selector_value,
            'total_pages_formula' => $this->total_pages_formula,
            'cards_to_iterate_selector_type' => $this->cards_to_iterate_selector_type,
            'cards_to_iterate_selector_value' => $this->cards_to_iterate_selector_value,
        ];
    }
}
