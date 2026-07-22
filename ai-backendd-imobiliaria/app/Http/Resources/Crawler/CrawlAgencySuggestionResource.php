<?php

namespace App\Http\Resources\Crawler;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CrawlAgencySuggestionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'crawl_agency_id' => $this->crawl_agency_id,
            'operation_id' => $this->operation_id,
            'differences' => $this->differences,
            'state' => $this->state,
            'created_at' => $this->created_at,
        ];
    }
}
