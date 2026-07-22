<?php

namespace App\Http\Resources\Crawler;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CrawlerOperationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'state' => $this->state,
            'crawl_agency_id' => $this->crawl_agency_id,
            'crawl_agency' => $this->whenLoaded('crawlAgency', fn () => $this->crawlAgency === null ? null : [
                'id' => $this->crawlAgency->id,
                'name' => $this->crawlAgency->name,
            ]),
            'requester' => $this->whenLoaded('requester', fn () => [
                'id' => $this->requester->id,
                'name' => $this->requester->name,
            ]),
            'groups' => $this->whenLoaded('groups', fn () => $this->groups->map(fn ($group) => [
                'id' => $group->id,
                'name' => $group->name,
            ])->values()),
            'worker' => $this->whenLoaded('worker', fn () => $this->worker === null ? null : [
                'id' => $this->worker->id,
                'worker_key' => $this->worker->worker_key,
            ]),
            'market_data_contract_version_id' => $this->market_data_contract_version_id,
            'retry_of_operation_id' => $this->retry_of_operation_id,
            'equivalence_key' => $this->equivalence_key,
            'plan' => $this->plan,
            'progress' => [
                'stage' => $this->stage,
                'percentage' => $this->progress_percentage,
                'processed' => $this->processed_items,
                'total' => $this->total_items,
                'message' => $this->progress_message,
                'heartbeat_at' => $this->heartbeat_at,
            ],
            'result' => $this->result,
            'error' => $this->error_code === null ? null : [
                'code' => $this->error_code,
                'message' => $this->error_message,
            ],
            'timeline' => $this->timeline(),
            'equivalent_failure_count' => (int) ($this->equivalent_failure_count ?? 0),
            'discovery_snapshot_id' => $this->discoverySnapshot?->id,
            'created_at' => $this->created_at,
            'completed_at' => $this->completed_at,
        ];
    }

    private function timeline(): array
    {
        $stages = ['queue', 'discovery', 'profile', 'crawl', 'filter', 'normalization', 'quality', 'publication'];
        $aliases = [
            'queued' => 'queue',
            'discovering' => 'discovery',
            'profile_generation' => 'profile',
            'profile_validation' => 'profile',
            'crawling' => 'crawl',
            'filtering' => 'filter',
            'normalizing' => 'normalization',
            'quality_gate' => 'quality',
            'publishing' => 'publication',
        ];
        $current = $aliases[$this->stage] ?? $this->stage;
        $currentIndex = array_search($current, $stages, true);
        $currentIndex = $currentIndex === false ? 0 : $currentIndex;

        return collect($stages)->map(function (string $stage, int $index) use ($currentIndex): array {
            $status = match (true) {
                $this->state === 'succeeded' => 'completed',
                $index < $currentIndex => 'completed',
                $index > $currentIndex => 'pending',
                $this->state === 'failed' => 'failed',
                $this->state === 'cancelled' => 'cancelled',
                default => 'current',
            };

            return ['stage' => $stage, 'status' => $status];
        })->all();
    }
}
