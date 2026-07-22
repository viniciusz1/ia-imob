<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
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
            'name' => $this->name,
            'email' => $this->email,
            'username' => $this->username,
            'phone' => $this->phone,
            'role_id' => $this->roles->first()?->id,
            'is_platform_admin' => $this->agency_id === null,
            'permissions' => $this->getAllPermissions()
                ->pluck('name')
                ->sort()
                ->values()
                ->all(),
            'avatar_path' => $this->avatar_path,
            'is_active' => $this->is_active,
            'last_seen_at' => $this->last_seen_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
