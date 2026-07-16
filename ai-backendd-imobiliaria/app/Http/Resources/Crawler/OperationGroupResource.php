<?php

namespace App\Http\Resources\Crawler;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OperationGroupResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $operations = $this->operations;
        $terminal = $operations->whereIn('state', ['succeeded', 'failed', 'cancelled']);
        $succeeded = $operations->where('state', 'succeeded')->count();
        $result = $terminal->count() !== $operations->count()
            ? 'in_progress'
            : ($succeeded === $operations->count() ? 'succeeded' : ($succeeded === 0 ? 'failed' : 'partial'));

        return [
            'id' => $this->id,
            'name' => $this->name,
            'action' => $this->action,
            'member_count' => $operations->count(),
            'progress_percentage' => $operations->isEmpty()
                ? 0
                : (int) round($operations->avg('progress_percentage')),
            'result' => $result,
            'operations' => CrawlerOperationResource::collection($operations),
            'created_at' => $this->created_at,
        ];
    }
}
