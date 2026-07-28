<?php

use App\Http\Controllers\Api\AdminAgencyController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\Crawler\CrawlAgencyController;
use App\Http\Controllers\Api\Crawler\CrawlerIntegrationController;
use App\Http\Controllers\Api\Crawler\CrawlerOperationControlController;
use App\Http\Controllers\Api\Crawler\CrawlerOperationController;
use App\Http\Controllers\Api\Crawler\CrawlerOverviewController;
use App\Http\Controllers\Api\Crawler\CrawlerScheduleController;
use App\Http\Controllers\Api\Crawler\CrawlRunController;
use App\Http\Controllers\Api\Crawler\CrawlRunRecordController;
use App\Http\Controllers\Api\Crawler\DiscoveryPolicyVersionController;
use App\Http\Controllers\Api\Crawler\DiscoverySnapshotController;
use App\Http\Controllers\Api\Crawler\DiscoveryStrategyController;
use App\Http\Controllers\Api\Crawler\ExtractionPolicyVersionController;
use App\Http\Controllers\Api\Crawler\ExtractionProfileController;
use App\Http\Controllers\Api\Crawler\ExtractionProfileDecisionController;
use App\Http\Controllers\Api\Crawler\MarketDataContractController;
use App\Http\Controllers\Api\Crawler\OnboardingExecutionController;
use App\Http\Controllers\Api\Crawler\OnboardingExecutionModelVersionController;
use App\Http\Controllers\Api\Crawler\OnboardingPlanController;
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
Route::middleware(['auth:sanctum', EnsurePlatformAdmin::class, 'can:platform.agencies.view'])->group(function () {
    Route::get('/ping', [AdminController::class, 'ping']);
    Route::get('/agencies', [AdminAgencyController::class, 'index']);
    Route::get('/agencies/{agency}', [AdminAgencyController::class, 'show']);
});

// Write endpoints: gated by platform.agencies.create
Route::middleware(['auth:sanctum', EnsurePlatformAdmin::class, 'can:platform.agencies.create'])->group(function () {
    Route::post('/agencies', [AdminAgencyController::class, 'store']);
});

// Update endpoints: gated by platform.agencies.update
Route::middleware(['auth:sanctum', EnsurePlatformAdmin::class, 'can:platform.agencies.update'])->group(function () {
    Route::put('/agencies/{agency}', [AdminAgencyController::class, 'update']);
});

// Status endpoints: gated by platform.agencies.deactivate
Route::middleware(['auth:sanctum', EnsurePlatformAdmin::class, 'can:platform.agencies.deactivate'])->group(function () {
    Route::post('/agencies/{agency}/deactivate', [AdminAgencyController::class, 'deactivate']);
    Route::post('/agencies/{agency}/activate', [AdminAgencyController::class, 'activate']);
});

Route::middleware(['auth:sanctum', EnsurePlatformAdmin::class, 'can:crawler.view'])
    ->prefix('crawler')
    ->group(function () {
        Route::get('/overview', CrawlerOverviewController::class);
        Route::get('/crawl-agencies', [CrawlAgencyController::class, 'index']);
        Route::get('/crawl-agencies/{crawlAgency}', [CrawlAgencyController::class, 'show']);
        Route::get('/crawl-agencies/{crawlAgency}/profile-workflow-operations', [CrawlerOperationController::class, 'profileWorkflow']);
        Route::get('/market-data-contracts', [MarketDataContractController::class, 'index']);
        Route::get('/operations', [CrawlerOperationController::class, 'index']);
        Route::get('/operations/{operation}', [CrawlerOperationController::class, 'show']);
        Route::get('/discovery-snapshots/{discoverySnapshot}/urls', [DiscoverySnapshotController::class, 'urls']);
        Route::get('/crawl-agencies/{crawlAgency}/discovery-snapshots', [DiscoverySnapshotController::class, 'index']);
        Route::get('/workers', [WorkerInstanceController::class, 'index']);
        Route::get('/crawl-agencies/{crawlAgency}/extraction-profiles', [ExtractionProfileController::class, 'index']);
        Route::get('/profile-validation-reports/{profileValidationReport}', [ProfileValidationController::class, 'show']);
        Route::get('/crawl-agencies/{crawlAgency}/extraction-profiles/{extractionProfile}/profile-validation-reports/{profileValidationReport}/records', [ProfileValidationController::class, 'records']);
        Route::get('/quality-snapshots', [CrawlRunController::class, 'quality']);
        Route::get('/crawl-runs/{crawlRun}', [CrawlRunController::class, 'show']);
        Route::get('/crawl-agencies/{crawlAgency}/crawl-runs', [CrawlRunController::class, 'index']);
        Route::get('/crawl-runs/{crawlRun}/records', [CrawlRunRecordController::class, 'index']);
        Route::get('/operation-groups/{operationGroup}', [OperationGroupController::class, 'show']);
        Route::get('/quality-policies', [QualityPolicyController::class, 'index']);
        Route::get('/prospects', [ProspectController::class, 'index']);
        Route::get('/crawl-agency-suggestions', [ProspectController::class, 'suggestions']);
        Route::get('/integrations', [CrawlerIntegrationController::class, 'index']);
        Route::post('/integrations/{integration}/test', [CrawlerIntegrationController::class, 'test']);
        Route::get('/schedule-default', [CrawlerScheduleController::class, 'default']);
        Route::get('/crawl-agencies/{crawlAgency}/schedule', [CrawlerScheduleController::class, 'showAgency']);
        Route::get('/discovery-strategies', [DiscoveryStrategyController::class, 'index']);
        Route::get('/discovery-policy-versions', [DiscoveryPolicyVersionController::class, 'index']);
        Route::get('/discovery-policy-versions/{discoveryPolicyVersion}', [DiscoveryPolicyVersionController::class, 'show']);
        Route::get('/extraction-policy-versions', [ExtractionPolicyVersionController::class, 'index']);
        Route::get('/extraction-policy-versions/{extractionPolicyVersion}', [ExtractionPolicyVersionController::class, 'show']);
        Route::get('/onboarding-execution-model-versions', [OnboardingExecutionModelVersionController::class, 'index']);
        Route::get('/onboarding-execution-model-versions/{onboardingExecutionModelVersion}', [OnboardingExecutionModelVersionController::class, 'show']);
        Route::get('/crawl-agencies/{crawlAgency}/onboarding-plan', [OnboardingPlanController::class, 'show']);
        Route::get('/crawl-agencies/{crawlAgency}/onboarding-executions', [OnboardingExecutionController::class, 'index']);
        Route::get('/onboarding-executions/{onboardingExecution}', [OnboardingExecutionController::class, 'show']);
    });

Route::middleware(['auth:sanctum', EnsurePlatformAdmin::class, 'can:crawler.operations.execute'])
    ->prefix('crawler')
    ->group(function () {
        Route::post('/operations', [CrawlerOperationController::class, 'store']);
        Route::post('/crawl-agencies/{crawlAgency}/sample-url-suggestion', SampleUrlSuggestionController::class);
        Route::post('/extraction-profiles/generate', [ExtractionProfileController::class, 'generate']);
        Route::post('/extraction-profiles/{extractionProfile}/validation', [ProfileValidationController::class, 'store']);
        Route::post('/production-crawls', [ProductionCrawlController::class, 'store']);
        Route::post('/crawl-runs/{crawlRun}/quality-evaluation', [CrawlRunController::class, 'evaluate']);
        Route::post('/operations/{operation}/retry', [CrawlerOperationControlController::class, 'retry']);
        Route::post('/operation-groups', [OperationGroupController::class, 'store']);
        Route::post('/operation-groups/{operationGroup}/actions', [OperationGroupController::class, 'action']);
        Route::put('/crawl-agencies/{crawlAgency}/onboarding-plan', [OnboardingPlanController::class, 'update']);
        Route::post('/crawl-agencies/{crawlAgency}/onboarding-plan/confirm', [OnboardingPlanController::class, 'confirm']);
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
        Route::post('/discovery-strategies', [DiscoveryStrategyController::class, 'store']);
        Route::post('/discovery-policy-versions', [DiscoveryPolicyVersionController::class, 'store']);
        Route::put('/discovery-policy-versions/{discoveryPolicyVersion}', [DiscoveryPolicyVersionController::class, 'update']);
        Route::post('/discovery-policy-versions/{discoveryPolicyVersion}/publish', [DiscoveryPolicyVersionController::class, 'publish']);
        Route::post('/discovery-policy-versions/{discoveryPolicyVersion}/versions', [DiscoveryPolicyVersionController::class, 'newVersion']);
        Route::post('/discovery-policy-versions/{discoveryPolicyVersion}/archive', [DiscoveryPolicyVersionController::class, 'archive']);
        Route::post('/extraction-policy-versions', [ExtractionPolicyVersionController::class, 'store']);
        Route::put('/extraction-policy-versions/{extractionPolicyVersion}', [ExtractionPolicyVersionController::class, 'update']);
        Route::post('/extraction-policy-versions/{extractionPolicyVersion}/publish', [ExtractionPolicyVersionController::class, 'publish']);
        Route::post('/extraction-policy-versions/{extractionPolicyVersion}/versions', [ExtractionPolicyVersionController::class, 'newVersion']);
        Route::post('/extraction-policy-versions/{extractionPolicyVersion}/archive', [ExtractionPolicyVersionController::class, 'archive']);
        Route::post('/onboarding-execution-model-versions', [OnboardingExecutionModelVersionController::class, 'store']);
        Route::put('/onboarding-execution-model-versions/{onboardingExecutionModelVersion}', [OnboardingExecutionModelVersionController::class, 'update']);
        Route::post('/onboarding-execution-model-versions/{onboardingExecutionModelVersion}/publish', [OnboardingExecutionModelVersionController::class, 'publish']);
        Route::post('/onboarding-execution-model-versions/{onboardingExecutionModelVersion}/versions', [OnboardingExecutionModelVersionController::class, 'newVersion']);
        Route::post('/onboarding-execution-model-versions/{onboardingExecutionModelVersion}/archive', [OnboardingExecutionModelVersionController::class, 'archive']);
        Route::post('/onboarding-execution-model-versions/{onboardingExecutionModelVersion}/default', [OnboardingExecutionModelVersionController::class, 'makeDefault']);
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
