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
            'decided_by' => $this->decided_by,
            'decider' => $this->whenLoaded('decider', fn () => $this->decider === null ? null : [
                'id' => $this->decider->id,
                'name' => $this->decider->name,
            ]),
            'decided_at' => $this->decided_at,
            'decision_reason' => $this->decision_reason,
            'activated_by' => $this->activated_by,
            'activator' => $this->whenLoaded('activator', fn () => $this->activator === null ? null : [
                'id' => $this->activator->id,
                'name' => $this->activator->name,
            ]),
            'activated_at' => $this->activated_at,
            'latest_validation_report' => $this->when(
                $this->relationLoaded('latestValidationReport'),
                fn () => $this->latestValidationReport === null
                    ? null
                    : new ProfileValidationReportResource($this->latestValidationReport),
            ),
            'created_at' => $this->created_at,
        ];
    }
}
