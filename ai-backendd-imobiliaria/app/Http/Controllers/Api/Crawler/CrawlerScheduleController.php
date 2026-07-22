<?php

namespace App\Http\Controllers\Api\Crawler;

use App\Http\Controllers\Controller;
use App\Http\Requests\Crawler\CrawlAgencyScheduleRequest;
use App\Http\Requests\Crawler\ScheduleDefaultRequest;
use App\Models\Crawler\CrawlAgency;
use App\Models\Crawler\ScheduleDefault;
use App\Services\Crawler\CrawlerScheduleService;
use Illuminate\Http\JsonResponse;

class CrawlerScheduleController extends Controller
{
    public function default(): JsonResponse
    {
        return response()->json(['data' => ScheduleDefault::query()->findOrFail(1)]);
    }

    public function updateDefault(ScheduleDefaultRequest $request, CrawlerScheduleService $service): JsonResponse
    {
        return response()->json([
            'data' => $service->updateDefault(
                $request->validated('preset'),
                $request->validated('timezone'),
                $request->user(),
            ),
        ]);
    }

    public function showAgency(CrawlAgency $crawlAgency, CrawlerScheduleService $service): JsonResponse
    {
        return response()->json(['data' => $service->representation($crawlAgency)]);
    }

    public function updateAgency(
        CrawlAgencyScheduleRequest $request,
        CrawlAgency $crawlAgency,
        CrawlerScheduleService $service,
    ): JsonResponse {
        $schedule = $service->updateAgency($crawlAgency, $request->validated(), $request->user());

        return response()->json(['data' => $service->representation($crawlAgency, $schedule)]);
    }
}
