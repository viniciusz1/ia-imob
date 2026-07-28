<?php

namespace App\Http\Resources\Crawler;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OnboardingExecutionModelVersionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'model_key' => $this->model_key,
            'name' => $this->name,
            'version' => $this->version,
            'status' => $this->status,
            'is_default' => $this->is_default,
            'mutable' => $this->status === 'draft',
            'discovery_policy_version_id' => $this->discovery_policy_version_id,
            'discovery_policy' => $this->whenLoaded(
                'discoveryPolicy',
                fn () => new DiscoveryPolicyVersionResource($this->discoveryPolicy),
            ),
            'extraction_policy_version_id' => $this->extraction_policy_version_id,
            'extraction_policy' => $this->whenLoaded(
                'extractionPolicy',
                fn () => new ExtractionPolicyVersionResource($this->extractionPolicy),
            ),
            'created_by' => $this->created_by,
            'plan_reference_count' => (int) ($this->plan_reference_count ?? 0),
            'execution_reference_count' => (int) ($this->execution_reference_count ?? 0),
            'created_at' => $this->created_at,
        ];
    }
}
