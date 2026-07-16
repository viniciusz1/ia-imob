<?php

namespace App\Http\Controllers\Api\Crawler;

use App\Http\Controllers\Controller;
use App\Http\Resources\Crawler\CrawlerOperationResource;
use App\Models\Crawler\CrawlerOperation;
use App\Services\Crawler\CrawlerOperationControlService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CrawlerOperationControlController extends Controller
{
    public function cancel(
        CrawlerOperation $operation,
        CrawlerOperationControlService $control,
    ): JsonResponse {
        return (new CrawlerOperationResource($control->cancel($operation)))
            ->response()
            ->setStatusCode(202);
    }

    public function retry(
        Request $request,
        CrawlerOperation $operation,
        CrawlerOperationControlService $control,
    ): CrawlerOperationResource {
        return new CrawlerOperationResource($control->retry($operation, $request->user()));
    }
}
