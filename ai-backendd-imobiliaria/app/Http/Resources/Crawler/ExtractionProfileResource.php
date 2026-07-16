<?php

namespace App\Http\Resources\Crawler;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExtractionProfileResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'crawl_agency_id' => $this->crawl_agency_id,
            'discovery_snapshot_id' => $this->discovery_snapshot_id,
            'market_data_contract_version_id' => $this->market_data_contract_version_id,
            'version' => $this->version,
            'status' => $this->status,
            'sample_url' => $this->sample_url,
            'schemas' => $this->schemas,
            'strategies' => $this->strategies,
            'fields' => $this->fields,
            'parameters' => $this->parameters,
            'created_at' => $this->created_at,
        ];
    }
}
