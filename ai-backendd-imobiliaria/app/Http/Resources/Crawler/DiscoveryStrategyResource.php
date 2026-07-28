<?php

namespace App\Http\Resources\Crawler;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DiscoveryStrategyResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'key' => $this->key,
            'label' => $this->label,
            'kind' => $this->kind,
            'safety_status' => $this->safety_status,
            'active' => $this->active,
            'created_by' => $this->created_by,
            'created_at' => $this->created_at,
        ];
    }
}
