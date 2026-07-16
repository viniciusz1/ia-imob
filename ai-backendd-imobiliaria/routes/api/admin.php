<?php

use App\Http\Controllers\Api\AdminAgencyController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\Crawler\CrawlAgencyController;
use App\Http\Controllers\Api\Crawler\CrawlerOperationControlController;
use App\Http\Controllers\Api\Crawler\CrawlerOperationController;
use App\Http\Controllers\Api\Crawler\CrawlerOverviewController;
use App\Http\Controllers\Api\Crawler\CrawlerScheduleController;
use App\Http\Controllers\Api\Crawler\CrawlRunController;
use App\Http\Controllers\Api\Crawler\CrawlRunRecordController;
use App\Http\Controllers\Api\Crawler\DiscoverySnapshotController;
use App\Http\Controllers\Api\Crawler\ExtractionProfileController;
use App\Http\Controllers\Api\Crawler\ExtractionProfileDecisionController;
use App\Http\Controllers\Api\Crawler\MarketDataContractController;
use App\Http\Controllers\Api\Crawler\OperationGroupController;
use App\Http\Controllers\Api\Crawler\ProductionCrawlController;
use App\Http\Controllers\Api\Crawler\ProfileValidationController;
use App\Http\Controllers\Api\Crawler\ProspectController;
use App\Http\Controllers\Api\Crawler\QualityDecisionController;
use App\Http\Controllers\Api\Crawler\QualityPolicyController;
use App\Http\Controllers\Api\Crawler\SampleUrlSuggestionController;
use App\Http\Controllers\Api\Crawler\WorkerInstanceController;
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
        Route::get('/market-data-contracts', [MarketDataContractController::class, 'index']);
        Route::get('/operations', [CrawlerOperationController::class, 'index']);
        Route::get('/operations/{operation}', [CrawlerOperationController::class, 'show']);
        Route::get('/discovery-snapshots/{discoverySnapshot}/urls', [DiscoverySnapshotController::class, 'urls']);
        Route::get('/crawl-agencies/{crawlAgency}/discovery-snapshots', [DiscoverySnapshotController::class, 'index']);
        Route::get('/workers', [WorkerInstanceController::class, 'index']);
        Route::get('/crawl-agencies/{crawlAgency}/extraction-profiles', [ExtractionProfileController::class, 'index']);
        Route::get('/profile-validation-reports/{profileValidationReport}', [ProfileValidationController::class, 'show']);
        Route::get('/crawl-runs/{crawlRun}', [CrawlRunController::class, 'show']);
        Route::get('/crawl-agencies/{crawlAgency}/crawl-runs', [CrawlRunController::class, 'index']);
        Route::get('/crawl-runs/{crawlRun}/records', [CrawlRunRecordController::class, 'index']);
        Route::get('/operation-groups/{operationGroup}', [OperationGroupController::class, 'show']);
        Route::get('/quality-policies', [QualityPolicyController::class, 'index']);
        Route::get('/prospects', [ProspectController::class, 'index']);
        Route::get('/crawl-agency-suggestions', [ProspectController::class, 'suggestions']);
        Route::get('/schedule-default', [CrawlerScheduleController::class, 'default']);
        Route::get('/crawl-agencies/{crawlAgency}/schedule', [CrawlerScheduleController::class, 'showAgency']);
    });

Route::middleware(['auth:sanctum', EnsurePlatformAdmin::class, 'can:crawler.operations.execute'])
    ->prefix('crawler')
    ->group(function () {
        Route::post('/operations', [CrawlerOperationController::class, 'store']);
        Route::post('/crawl-agencies/{crawlAgency}/sample-url-suggestion', SampleUrlSuggestionController::class);
        Route::post('/extraction-profiles/generate', [ExtractionProfileController::class, 'generate']);
        Route::post('/extraction-profiles/{extractionProfile}/validation', [ProfileValidationController::class, 'store']);
        Route::post('/production-crawls', [ProductionCrawlController::class, 'store']);
        Route::post('/operations/{operation}/retry', [CrawlerOperationControlController::class, 'retry']);
        Route::post('/operation-groups', [OperationGroupController::class, 'store']);
        Route::post('/operation-groups/{operationGroup}/actions', [OperationGroupController::class, 'action']);
    });

Route::middleware(['auth:sanctum', EnsurePlatformAdmin::class, 'can:crawler.operations.cancel'])
    ->prefix('crawler')
    ->group(function () {
        Route::post('/operations/{operation}/cancel', [CrawlerOperationControlController::class, 'cancel']);
    });

Route::middleware(['auth:sanctum', EnsurePlatformAdmin::class, 'can:crawler.profiles.approve'])
    ->prefix('crawler')
    ->group(function () {
        Route::post('/extraction-profiles/{extractionProfile}/decision', [ExtractionProfileDecisionController::class, 'decide']);
        Route::post('/extraction-profiles/{extractionProfile}/activate', [ExtractionProfileDecisionController::class, 'activate']);
    });

Route::middleware(['auth:sanctum', EnsurePlatformAdmin::class, 'can:crawler.prospects.manage'])
    ->prefix('crawler')
    ->group(function () {
        Route::post('/prospecting-operations', [ProspectController::class, 'queue']);
        Route::post('/prospecting-requery-preview', [ProspectController::class, 'preview']);
        Route::post('/prospecting-operation-groups', [ProspectController::class, 'queueGroup']);
        Route::post('/prospects/{prospect}/decision', [ProspectController::class, 'decide']);
        Route::post('/prospects/{prospect}/promote', [ProspectController::class, 'promote']);
    });

Route::middleware(['auth:sanctum', EnsurePlatformAdmin::class, 'can:crawler.policies.manage'])
    ->prefix('crawler')
    ->group(function () {
        Route::post('/quality-policies', [QualityPolicyController::class, 'store']);
        Route::post('/quality-policies/{qualityPolicy}/validate', [QualityPolicyController::class, 'validatePolicy']);
        Route::post('/quality-policies/{qualityPolicy}/activate', [QualityPolicyController::class, 'activate']);
        Route::post('/quality-reports/{qualityReport}/exceptions', [QualityDecisionController::class, 'exception']);
    });

Route::middleware(['auth:sanctum', EnsurePlatformAdmin::class, 'can:crawler.snapshots.publish_exceptionally'])
    ->prefix('crawler')
    ->group(function () {
        Route::post('/crawl-runs/{crawlRun}/exceptional-publication', [QualityDecisionController::class, 'publishExceptionally']);
    });

Route::middleware(['auth:sanctum', EnsurePlatformAdmin::class, 'can:crawler.agencies.activate'])
    ->prefix('crawler')
    ->group(function () {
        Route::post('/crawl-agencies/{crawlAgency}/activate', [CrawlAgencyController::class, 'activate']);
    });

Route::middleware(['auth:sanctum', EnsurePlatformAdmin::class, 'can:crawler.policies.manage'])
    ->prefix('crawler')
    ->group(function () {
        Route::post('/market-data-contracts', [MarketDataContractController::class, 'store']);
        Route::post('/market-data-contracts/{marketDataContract}/validate', [MarketDataContractController::class, 'validateContract']);
        Route::post('/market-data-contracts/{marketDataContract}/activate', [MarketDataContractController::class, 'activate']);
    });

Route::middleware(['auth:sanctum', EnsurePlatformAdmin::class, 'can:crawler.agencies.manage'])
    ->prefix('crawler')
    ->group(function () {
        Route::post('/crawl-agencies', [CrawlAgencyController::class, 'store']);
        Route::put('/crawl-agencies/{crawlAgency}', [CrawlAgencyController::class, 'update']);
        Route::patch('/crawl-agencies/{crawlAgency}/lifecycle', [CrawlAgencyController::class, 'transition']);
    });

Route::middleware(['auth:sanctum', EnsurePlatformAdmin::class, 'can:crawler.schedules.manage'])
    ->prefix('crawler')
    ->group(function () {
        Route::put('/schedule-default', [CrawlerScheduleController::class, 'updateDefault']);
        Route::put('/crawl-agencies/{crawlAgency}/schedule', [CrawlerScheduleController::class, 'updateAgency']);
    });
