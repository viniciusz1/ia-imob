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
        return DB::transaction(function () use ($operation, $requester): CrawlerOperation {
            $locked = CrawlerOperation::query()->lockForUpdate()->findOrFail($operation->id);
            if (! in_array($locked->state, ['failed', 'cancelled'], true)) {
                throw ValidationException::withMessages(['state' => 'Only failed or cancelled operations can be retried.']);
            }

            if ($locked->equivalence_key !== null) {
                $pending = CrawlerOperation::query()
                    ->where('state', 'queued')
                    ->where('type', $locked->type)
                    ->where('crawl_agency_id', $locked->crawl_agency_id)
                    ->where('equivalence_key', $locked->equivalence_key)
                    ->when(
                        $locked->onboarding_execution_id === null,
                        fn ($query) => $query->whereNull('onboarding_execution_id'),
                        fn ($query) => $query->where('onboarding_execution_id', $locked->onboarding_execution_id),
                    )
                    ->first();
                if ($pending !== null) {
                    return $pending;
                }
            }

            $attempt = 1;
            if ($locked->onboarding_execution_id !== null) {
                $execution = $locked->onboardingExecution()->lockForUpdate()->firstOrFail();
                $activeAttempt = $execution->operations()
                    ->where('onboarding_step', $locked->onboarding_step)
                    ->where('attempt', '>', $locked->attempt)
                    ->whereIn('state', ['queued', 'running', 'cancellation_requested'])
                    ->latest('attempt')
                    ->first();
                if ($activeAttempt !== null) {
                    return $activeAttempt;
                }
                if (
                    $execution->state !== 'requires_attention'
                    || $execution->current_step !== $locked->onboarding_step
                ) {
                    throw ValidationException::withMessages([
                        'state' => 'Retry the failed operation only while its onboarding step requires attention.',
                    ]);
                }
                $attempt = ((int) $execution->operations()
                    ->where('onboarding_step', $locked->onboarding_step)
                    ->max('attempt')) + 1;
                $execution->update([
                    'state' => 'running',
                    'paused_at' => null,
                    'attention_code' => null,
                    'attention_message' => null,
                ]);
            }

            return CrawlerOperation::query()->create([
                'type' => $locked->type,
                'state' => 'queued',
                'requested_by' => $requester->id,
                'crawl_agency_id' => $locked->crawl_agency_id,
                'market_data_contract_version_id' => $locked->market_data_contract_version_id,
                'retry_of_operation_id' => $locked->id,
                'equivalence_key' => $locked->equivalence_key,
                'plan' => $locked->plan,
                'onboarding_execution_id' => $locked->onboarding_execution_id,
                'onboarding_step' => $locked->onboarding_step,
                'attempt' => $attempt,
            ])->refresh();
        });
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
