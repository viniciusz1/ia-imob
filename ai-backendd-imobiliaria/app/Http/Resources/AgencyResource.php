<?php

namespace App\Http\Resources;

use App\Models\AgencyConfiguration;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AgencyResource extends JsonResource
{
    /**
     * Transform the Agency into an array for the Platform Admin API.
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'is_active' => (bool) $this->is_active,
            'market_search_access' => [
                'allowed_cities' => $this->configuration?->allowed_cities,
                'allowed_crawl_agency_ids' => $this->configuration?->allowed_crawl_agency_ids,
            ],
            'market_search_weekly_limit' => (int) ($this->configuration?->market_search_weekly_limit
                ?? AgencyConfiguration::DEFAULT_MARKET_SEARCH_WEEKLY_LIMIT),
            'market_search_usage' => $this->when(
                $this->resource->getAttribute('market_search_usage_summary') !== null,
                $this->resource->getAttribute('market_search_usage_summary'),
            ),
            'owner_user_id' => $this->owner_user_id,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
