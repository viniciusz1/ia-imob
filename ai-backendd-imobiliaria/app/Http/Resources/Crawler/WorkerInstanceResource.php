<?php

namespace App\Http\Resources\Crawler;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WorkerInstanceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $health = $this->last_heartbeat_at?->lt(now()->subMinutes(2))
            ? 'unavailable'
            : $this->health_state;

        return [
            'id' => $this->id,
            'worker_key' => $this->worker_key,
            'version' => $this->version,
            'capacity' => $this->capacity,
            'health_state' => $health,
            'last_heartbeat_at' => $this->last_heartbeat_at,
        ];
    }
}
