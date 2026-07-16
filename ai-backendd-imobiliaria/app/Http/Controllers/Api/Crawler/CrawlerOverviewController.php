<?php

namespace App\Http\Controllers\Api\Crawler;

use App\Http\Controllers\Controller;
use App\Http\Resources\Crawler\CrawlerOperationResource;
use App\Models\Crawler\CrawlAgency;
use App\Models\Crawler\CrawlAgencyCircuit;
use App\Models\Crawler\CrawlerOperation;
use App\Models\Crawler\WorkerInstance;
use App\Models\CrawlerRun;
use Illuminate\Http\JsonResponse;

class CrawlerOverviewController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $agencies = CrawlAgency::query()->get();
        $activeOperations = CrawlerOperation::query()
            ->whereIn('state', ['queued', 'running', 'cancellation_requested'])
            ->latest('id')->limit(5)->get();
        $recentFailures = CrawlerOperation::query()->where('state', 'failed')->latest('id')->limit(5)->get();
        $circuits = CrawlAgencyCircuit::query()->where('state', 'open')->get();
        $quarantined = CrawlerRun::query()->where('publication_state', 'quarantined')->latest('id')->limit(10)->get();
        $unavailableWorkers = WorkerInstance::query()->get()->filter(
            fn (WorkerInstance $worker): bool => $worker->health_state !== 'healthy'
                || $worker->last_heartbeat_at?->lt(now()->subMinutes(2)),
        );
        $alerts = collect()
            ->concat($circuits->map(fn (CrawlAgencyCircuit $circuit) => [
                'kind' => 'circuit_open',
                'title' => 'Crawl Agency com circuito aberto',
                'detail' => $circuit->reason,
                'href' => "/admin/crawler/agencies/{$circuit->crawl_agency_id}",
            ]))
            ->concat($recentFailures->map(fn (CrawlerOperation $operation) => [
                'kind' => 'operation_failure',
                'title' => "Falha na operação #{$operation->id}",
                'detail' => $operation->error_code,
                'href' => '/admin/crawler/operations?state=failed',
            ]))
            ->concat($quarantined->map(fn (CrawlerRun $run) => [
                'kind' => 'quarantined_snapshot',
                'title' => "Snapshot #{$run->id} em quarentena",
                'detail' => 'Requer inspeção de qualidade',
                'href' => "/admin/crawler/runs/{$run->id}",
            ]))
            ->concat($unavailableWorkers->map(fn (WorkerInstance $worker) => [
                'kind' => 'worker_unavailable',
                'title' => "Worker {$worker->worker_key} indisponível",
                'detail' => 'Heartbeat ou saúde degradados',
                'href' => '/admin/crawler/operations#workers',
            ]))->values();

        return response()->json([
            'data' => [
                'module' => 'crawler-operations',
                'agencies' => [
                    'total' => $agencies->count(),
                    'lifecycle' => $this->counts($agencies, 'lifecycle_state', ['onboarding', 'active', 'paused', 'archived']),
                    'health' => $this->counts($agencies, 'health_state', ['unknown', 'healthy', 'degraded', 'unavailable']),
                ],
                'operations' => [
                    'active' => CrawlerOperation::query()->whereIn('state', ['queued', 'running', 'cancellation_requested'])->count(),
                    'failed' => CrawlerOperation::query()->where('state', 'failed')->count(),
                ],
                'open_circuits' => $circuits->count(),
                'quarantined_snapshots' => CrawlerRun::query()->where('publication_state', 'quarantined')->count(),
                'active_operations' => CrawlerOperationResource::collection($activeOperations)->resolve(),
                'recent_failures' => CrawlerOperationResource::collection($recentFailures)->resolve(),
                'alerts' => $alerts,
            ],
        ]);
    }

    private function counts($models, string $field, array $values): array
    {
        return collect($values)->mapWithKeys(fn (string $value) => [
            $value => $models->where($field, $value)->count(),
        ])->all();
    }
}
