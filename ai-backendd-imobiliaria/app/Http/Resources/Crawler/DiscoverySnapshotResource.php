<?php

namespace App\Http\Resources\Crawler;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DiscoverySnapshotResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'operation_id' => $this->operation_id,
            'crawl_agency_id' => $this->crawl_agency_id,
            'url_count' => $this->url_count,
            'content_hash' => $this->content_hash,
            'created_at' => $this->created_at,
        ];
    }
}
