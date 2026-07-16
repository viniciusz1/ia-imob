<?php

namespace App\Http\Resources\Crawler;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProfileValidationReportResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'operation_id' => $this->operation_id,
            'extraction_profile_id' => $this->extraction_profile_id,
            'sampled_url_count' => $this->sampled_url_count,
            'valid_record_count' => $this->valid_record_count,
            'valid_ratio' => $this->valid_ratio,
            'required_field_coverage' => $this->required_field_coverage,
            'blocking_failures' => $this->blocking_failures,
            'warnings' => $this->warnings,
            'eligible' => $this->eligible,
            'records' => ProfileValidationRecordResource::collection($this->whenLoaded('records')),
            'created_at' => $this->created_at,
        ];
    }
}
