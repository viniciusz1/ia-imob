<?php

namespace App\Http\Resources\Crawler;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProfileValidationRecordResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'url' => $this->url,
            'raw_data' => $this->raw_data,
            'normalized_data' => $this->normalized_data,
            'errors' => $this->errors,
            'field_presence' => $this->field_presence,
            'is_valid' => $this->is_valid,
        ];
    }
}
