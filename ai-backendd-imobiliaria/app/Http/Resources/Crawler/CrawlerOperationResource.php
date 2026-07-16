<?php

namespace App\Http\Resources\Crawler;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CrawlerOperationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'state' => $this->state,
            'crawl_agency_id' => $this->crawl_agency_id,
            'market_data_contract_version_id' => $this->market_data_contract_version_id,
            'retry_of_operation_id' => $this->retry_of_operation_id,
            'equivalence_key' => $this->equivalence_key,
            'plan' => $this->plan,
            'progress' => [
                'stage' => $this->stage,
                'percentage' => $this->progress_percentage,
                'processed' => $this->processed_items,
                'total' => $this->total_items,
                'message' => $this->progress_message,
                'heartbeat_at' => $this->heartbeat_at,
            ],
            'result' => $this->result,
            'error' => $this->error_code === null ? null : [
                'code' => $this->error_code,
                'message' => $this->error_message,
            ],
            'discovery_snapshot_id' => $this->discoverySnapshot?->id,
            'created_at' => $this->created_at,
            'completed_at' => $this->completed_at,
        ];
    }
}
