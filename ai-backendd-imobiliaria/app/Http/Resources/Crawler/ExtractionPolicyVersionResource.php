<?php

namespace App\Http\Resources\Crawler;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExtractionPolicyVersionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'version' => $this->version,
            'status' => $this->status,
            'strategies' => $this->strategies,
            'configuration' => $this->configuration,
            'created_by' => $this->created_by,
            'created_at' => $this->created_at,
        ];
    }
}
