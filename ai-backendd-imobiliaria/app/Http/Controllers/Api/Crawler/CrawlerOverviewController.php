<?php

namespace App\Http\Controllers\Api\Crawler;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class CrawlerOverviewController extends Controller
{
    public function __invoke(): JsonResponse
    {
        return response()->json([
            'data' => [
                'module' => 'crawler-operations',
            ],
        ]);
    }
}
