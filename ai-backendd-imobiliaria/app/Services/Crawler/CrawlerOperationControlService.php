<?php

namespace App\Services\Crawler;

use App\Models\Crawler\CrawlerOperation;
use App\Models\Crawler\OperationGroup;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CrawlerOperationControlService
{
    public function cancel(CrawlerOperation $operation): CrawlerOperation
    {
        return DB::transaction(function () use ($operation): CrawlerOperation {
            $locked = CrawlerOperation::query()->lockForUpdate()->findOrFail($operation->id);
            if ($locked->state === 'queued') {
                $locked->update(['state' => 'cancelled', 'completed_at' => now()]);
            } elseif ($locked->state === 'running') {
                $locked->update([
                    'state' => 'cancellation_requested',
                    'cancellation_requested_at' => now(),
                ]);
            } elseif ($locked->state !== 'cancellation_requested') {
                throw ValidationException::withMessages(['state' => 'Only queued or running operations can be cancelled.']);
            }

            return $locked->refresh();
        });
    }

    public function retry(CrawlerOperation $operation, User $requester): CrawlerOperation
    {
        if (! in_array($operation->state, ['failed', 'cancelled'], true)) {
            throw ValidationException::withMessages(['state' => 'Only failed or cancelled operations can be retried.']);
        }

        if ($operation->equivalence_key !== null) {
            $pending = CrawlerOperation::query()
                ->where('state', 'queued')
                ->where('type', $operation->type)
                ->where('crawl_agency_id', $operation->crawl_agency_id)
                ->where('equivalence_key', $operation->equivalence_key)
                ->first();
            if ($pending !== null) {
                return $pending;
            }
        }

        return CrawlerOperation::query()->create([
            'type' => $operation->type,
            'state' => 'queued',
            'requested_by' => $requester->id,
            'crawl_agency_id' => $operation->crawl_agency_id,
            'market_data_contract_version_id' => $operation->market_data_contract_version_id,
            'retry_of_operation_id' => $operation->id,
            'equivalence_key' => $operation->equivalence_key,
            'plan' => $operation->plan,
        ])->refresh();
    }

    public function createGroup(string $name, array $operationIds, User $requester, string $action = 'aggregate'): OperationGroup
    {
        $uniqueOperationIds = array_values(array_unique($operationIds));
        if ($uniqueOperationIds === []) {
            throw ValidationException::withMessages(['operation_ids' => 'At least one eligible operation is required.']);
        }

        $operations = CrawlerOperation::query()->whereIn('id', $uniqueOperationIds)->get();
        if ($operations->count() !== count($uniqueOperationIds)) {
            throw ValidationException::withMessages(['operation_ids' => 'One or more operations do not exist.']);
        }

        return DB::transaction(function () use ($action, $name, $operations, $requester): OperationGroup {
            $group = OperationGroup::query()->create([
                'name' => $name,
                'action' => $action,
                'requested_by' => $requester->id,
            ]);
            $group->operations()->attach($operations->pluck('id'));

            return $group->load('operations');
        });
    }
}
