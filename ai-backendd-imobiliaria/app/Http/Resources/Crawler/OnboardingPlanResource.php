<?php

namespace App\Http\Resources\Crawler;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OnboardingPlanResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'prospect_id' => $this->prospect_id,
            'crawl_agency_id' => $this->crawl_agency_id,
            'name' => $this->name,
            'conduction' => $this->conduction,
            'status' => $this->status,
            'steps' => $this->steps,
            'execution_model_version_id' => $this->execution_model_version_id,
            'manual_configuration' => $this->manual_configuration,
            'first_production_discovery_mode' => $this->first_production_discovery_mode,
            'execution_model' => $this->whenLoaded(
                'executionModel',
                fn () => $this->executionModel === null
                    ? null
                    : new OnboardingExecutionModelVersionResource($this->executionModel),
            ),
            'confirmed_by' => $this->confirmed_by,
            'confirmed_at' => $this->confirmed_at,
            'created_by' => $this->created_by,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
