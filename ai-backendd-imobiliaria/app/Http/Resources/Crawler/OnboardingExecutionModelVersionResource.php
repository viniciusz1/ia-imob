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
            'name' => $this->name,
            'version' => $this->version,
            'status' => $this->status,
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
            'created_at' => $this->created_at,
        ];
    }
}
