<?php

use App\Http\Controllers\Api\AdminAgencyController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\Crawler\CrawlerOverviewController;
use App\Http\Controllers\Api\Crawler\CrawlAgencyController;
use App\Http\Middleware\EnsurePlatformAdmin;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Platform Admin API Routes
|--------------------------------------------------------------------------
|
| Protected by auth:sanctum and the platform.agencies.view permission.
| Only Platform Admin users (agency-less, with platform permissions)
| can reach these endpoints.
|
*/

// Read endpoints: gated by platform.agencies.view
Route::middleware(['auth:sanctum', 'can:platform.agencies.view'])->group(function () {
    Route::get('/ping', [AdminController::class, 'ping']);
    Route::get('/agencies', [AdminAgencyController::class, 'index']);
    Route::get('/agencies/{agency}', [AdminAgencyController::class, 'show']);
});

// Write endpoints: gated by platform.agencies.create
Route::middleware(['auth:sanctum', 'can:platform.agencies.create'])->group(function () {
    Route::post('/agencies', [AdminAgencyController::class, 'store']);
});

// Update endpoints: gated by platform.agencies.update
Route::middleware(['auth:sanctum', 'can:platform.agencies.update'])->group(function () {
    Route::put('/agencies/{agency}', [AdminAgencyController::class, 'update']);
});

// Status endpoints: gated by platform.agencies.deactivate
Route::middleware(['auth:sanctum', 'can:platform.agencies.deactivate'])->group(function () {
    Route::post('/agencies/{agency}/deactivate', [AdminAgencyController::class, 'deactivate']);
    Route::post('/agencies/{agency}/activate', [AdminAgencyController::class, 'activate']);
});

Route::middleware(['auth:sanctum', EnsurePlatformAdmin::class, 'can:crawler.view'])
    ->prefix('crawler')
    ->group(function () {
        Route::get('/overview', CrawlerOverviewController::class);
        Route::get('/crawl-agencies', [CrawlAgencyController::class, 'index']);
        Route::get('/crawl-agencies/{crawlAgency}', [CrawlAgencyController::class, 'show']);
    });

Route::middleware(['auth:sanctum', EnsurePlatformAdmin::class, 'can:crawler.agencies.manage'])
    ->prefix('crawler')
    ->group(function () {
        Route::post('/crawl-agencies', [CrawlAgencyController::class, 'store']);
        Route::put('/crawl-agencies/{crawlAgency}', [CrawlAgencyController::class, 'update']);
        Route::patch('/crawl-agencies/{crawlAgency}/lifecycle', [CrawlAgencyController::class, 'transition']);
    });
