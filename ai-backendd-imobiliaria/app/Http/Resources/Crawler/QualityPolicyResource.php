<?php

namespace App\Http\Resources\Crawler;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QualityPolicyResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'version' => $this->version,
            'status' => $this->status,
            'rules' => $this->rules,
            'created_by' => $this->created_by,
            'activated_by' => $this->activated_by,
            'activated_at' => $this->activated_at,
            'created_at' => $this->created_at,
        ];
    }
}
