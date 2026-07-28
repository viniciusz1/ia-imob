<?php

namespace App\Http\Resources\Crawler;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DiscoveryPolicyVersionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'policy_key' => $this->policy_key,
            'name' => $this->name,
            'version' => $this->version,
            'status' => $this->status,
            'strategies' => $this->strategies,
            'configuration' => $this->configuration,
            'mutable' => $this->status === 'draft',
            'model_reference_count' => (int) ($this->model_reference_count ?? 0),
            'active_model_reference_count' => (int) ($this->active_model_reference_count ?? 0),
            'created_by' => $this->created_by,
            'created_at' => $this->created_at,
        ];
    }
}
