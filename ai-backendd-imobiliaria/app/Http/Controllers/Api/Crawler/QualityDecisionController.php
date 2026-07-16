<?php

namespace App\Http\Controllers\Api\Crawler;

use App\Http\Controllers\Controller;
use App\Http\Requests\Crawler\QualityDecisionRequest;
use App\Http\Resources\Crawler\CrawlRunResource;
use App\Models\Crawler\QualityGateReport;
use App\Models\Crawler\QualityPolicyException;
use App\Models\CrawlerRun;
use App\Services\Crawler\ExceptionalPublicationService;
use Illuminate\Http\JsonResponse;

class QualityDecisionController extends Controller
{
    public function exception(QualityDecisionRequest $request, QualityGateReport $qualityReport): JsonResponse
    {
        $exception = QualityPolicyException::query()->create([
            'crawl_agency_id' => $qualityReport->crawlRun->crawl_agency_id,
            'quality_gate_report_id' => $qualityReport->id,
            'created_by' => $request->user()->id,
            'reason' => $request->validated('reason'),
        ]);

        return response()->json(['data' => $exception], 201);
    }

    public function publishExceptionally(
        QualityDecisionRequest $request,
        CrawlerRun $crawlRun,
        ExceptionalPublicationService $publication,
    ): JsonResponse {
        return (new CrawlRunResource($publication->publish($crawlRun, $request->user(), $request->validated('reason'))))
            ->response()
            ->setStatusCode(201);
    }
}
