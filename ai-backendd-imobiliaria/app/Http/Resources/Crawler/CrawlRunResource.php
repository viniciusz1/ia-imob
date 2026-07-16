<?php

namespace App\Http\Resources\Crawler;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CrawlRunResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'operation_id' => $this->operation_id,
            'crawl_agency_id' => $this->crawl_agency_id,
            'discovery_snapshot_id' => $this->discovery_snapshot_id,
            'extraction_profile_id' => $this->extraction_profile_id,
            'market_data_contract_version_id' => $this->market_data_contract_version_id,
            'quality_policy_version_id' => $this->quality_policy_version_id,
            'technical_state' => $this->technical_state,
            'result_kind' => $this->result_kind,
            'publication_state' => $this->publication_state,
            'publishable' => $this->publishable,
            'counts' => [
                'raw' => $this->raw_count,
                'normalized' => $this->normalized_count,
                'rejected' => $this->rejected_count,
                'errors' => $this->error_count,
            ],
            'error_summary' => $this->error_summary,
            'started_at' => $this->started_at,
            'completed_at' => $this->completed_at,
            'created_at' => $this->created_at,
        ];
    }
}
