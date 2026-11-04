<?php

namespace App\Http\Controllers\Api\Crawler;

use App\Http\Controllers\Controller;
use App\Http\Resources\Crawler\CrawlerOperationResource;
use App\Models\Crawler\CrawlerOperation;
use App\Services\Crawler\CrawlerOperationQueueReader;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CrawlerOperationQueueController extends Controller
{
    public function __invoke(Request $request, CrawlerOperationQueueReader $reader): JsonResponse
    {
        $input = $request->validate([
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);
        $page = $reader->queued((int) ($input['per_page'] ?? 25));

        return response()->json([
            'running' => CrawlerOperationResource::collection($reader->running())->resolve($request),
            'data' => $page->getCollection()->map(fn (CrawlerOperation $operation) => [
                'position' => $operation->queue_position,
                'blocked_by_operation_id' => $operation->blocked_by_operation_id,
                'operation' => (new CrawlerOperationResource($operation))->resolve($request),
            ])->values(),
            'meta' => [
                'current_page' => $page->currentPage(), 'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(), 'total' => $page->total(),
            ],
        ]);
    }
}
