<?php

namespace App\Http\Resources\Crawler;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProspectResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'root_domain' => $this->root_domain,
            'google_place_id' => $this->google_place_id,
            'name' => $this->name,
            'city' => $this->city,
            'state' => $this->state,
            'base_url' => $this->base_url,
            'phone' => $this->phone,
            'address' => $this->address,
            'source' => $this->source,
            'automatic_classification' => $this->automatic_classification,
            'automatic_reason' => $this->automatic_reason,
            'review_state' => $this->review_state,
            'reviewed_by' => $this->reviewed_by,
            'reviewed_at' => $this->reviewed_at,
            'review_reason' => $this->review_reason,
            'promoted_crawl_agency_id' => $this->promoted_crawl_agency_id,
            'latest_operation_id' => $this->latest_operation_id,
            'metadata' => $this->metadata,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
