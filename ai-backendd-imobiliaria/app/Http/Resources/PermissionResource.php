<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PermissionResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $permissionName = (string) $this->name;

        return [
            'id' => $this->id,
            'name' => $permissionName,
            'label' => str($permissionName)
                ->replace(['.', '_', '-'], ' ')
                ->title()
                ->toString(),
        ];
    }
}
