<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class PropertyImageResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'url' => filter_var($this->path, FILTER_VALIDATE_URL) ? $this->path : Storage::disk('public')->url($this->path),
            'is_cover' => (bool) $this->is_cover,
            'order' => $this->order,
            'description' => $this->description,
        ];
    }
}
