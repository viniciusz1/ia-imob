<?php

namespace App\Http\Controllers\Api\Crawler;

use App\Http\Controllers\Controller;
use App\Http\Requests\Crawler\OperationGroupActionRequest;
use App\Http\Requests\Crawler\StoreOperationGroupRequest;
use App\Http\Resources\Crawler\OperationGroupResource;
use App\Models\Crawler\OperationGroup;
use App\Services\Crawler\CrawlerOperationControlService;
use Illuminate\Validation\ValidationException;

class OperationGroupController extends Controller
{
    public function store(
        StoreOperationGroupRequest $request,
        CrawlerOperationControlService $control,
    ): OperationGroupResource {
        return new OperationGroupResource($control->createGroup(
            $request->validated('name'),
            $request->validated('operation_ids'),
            $request->user(),
        ));
    }

    public function show(OperationGroup $operationGroup): OperationGroupResource
    {
        return new OperationGroupResource($operationGroup->load('operations'));
    }

    public function action(
        OperationGroupActionRequest $request,
        OperationGroup $operationGroup,
        CrawlerOperationControlService $control,
    ): OperationGroupResource {
        $selected = $operationGroup->operations()
            ->whereIn('crawler.operations.id', $request->validated('operation_ids'))
            ->get();
        if ($request->validated('action') === 'cancel') {
            abort_unless($request->user()->can('crawler.operations.cancel'), 403);
            $selected
                ->whereIn('state', ['queued', 'running', 'cancellation_requested'])
                ->each(fn ($operation) => $control->cancel($operation));

            return new OperationGroupResource($operationGroup->load('operations'));
        }

        $retries = $selected
            ->whereIn('state', ['failed', 'cancelled'])
            ->map(fn ($operation) => $control->retry($operation, $request->user()));
        if ($retries->isEmpty()) {
            throw ValidationException::withMessages(['operation_ids' => 'No selected operations are eligible for retry.']);
        }

        return new OperationGroupResource($control->createGroup(
            'Retry: '.$operationGroup->name,
            $retries->pluck('id')->all(),
            $request->user(),
            'retry',
        ));
    }
}
