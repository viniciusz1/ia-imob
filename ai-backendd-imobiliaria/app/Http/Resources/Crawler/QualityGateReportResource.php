<?php

namespace App\Http\Resources\Crawler;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QualityGateReportResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'verdict' => $this->verdict,
            'blockers' => $this->blockers,
            'warnings' => $this->warnings,
            'evidence' => $this->evidence,
            'market_data_contract_version_id' => $this->market_data_contract_version_id,
            'quality_policy_version_id' => $this->quality_policy_version_id,
            'evaluated_at' => $this->evaluated_at,
        ];
    }
}
