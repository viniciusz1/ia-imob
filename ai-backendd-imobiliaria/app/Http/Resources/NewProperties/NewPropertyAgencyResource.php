<?php

namespace App\Http\Resources\NewProperties;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NewPropertyAgencyResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'crawl_agency' => $this->resource['crawl_agency'],
            'snapshot' => $this->resource['snapshot'],
            'counts' => $this->resource['counts'],
            'history' => $this->resource['history'],
            'properties' => NewPropertyResource::collection($this->resource['properties']),
        ];
    }
}
