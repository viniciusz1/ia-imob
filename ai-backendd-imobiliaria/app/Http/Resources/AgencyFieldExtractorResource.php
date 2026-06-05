<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AgencyFieldExtractorResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'agency_type' => $this->agency_type,
            'agency_id' => $this->agency_id,
            'field_name' => $this->field_name,
            'priority' => $this->priority,
            'source_type' => $this->source_type,
            'selector_value' => $this->selector_value,
            'selector_index' => $this->selector_index,
            'selector_params' => $this->selector_params,
            'selector_join' => $this->selector_join,
            'pipeline' => $this->pipeline,
            'output_type' => $this->output_type,
            'is_optional' => $this->is_optional,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
