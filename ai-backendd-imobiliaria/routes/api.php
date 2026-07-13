<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\PermissionController;
use App\Http\Controllers\Api\RoleController;
use Illuminate\Support\Facades\Route;

Route::middleware(['throttle:5,1'])->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/ping', [AuthController::class, 'ping']);

    Route::apiResource('roles', RoleController::class);
    Route::get('permissions', [PermissionController::class, 'index']);

    // Properties Module
    Route::apiResource('properties', \App\Http\Controllers\Api\PropertyController::class);
    Route::get('valuations/{valuation}/report.pdf', [\App\Http\Controllers\Api\ValuationController::class, 'report']);
    Route::get('valuations/{valuation}/report.docx', [\App\Http\Controllers\Api\ValuationController::class, 'wordReport']);
    Route::get('valuations/{valuation}/comparables.xlsx', [\App\Http\Controllers\Api\ValuationController::class, 'comparableEvidence']);
    Route::post('valuations/candidates', [\App\Http\Controllers\Api\ValuationController::class, 'candidates']);
    Route::apiResource('valuations', \App\Http\Controllers\Api\ValuationController::class)->only(['index', 'store', 'show']);
    Route::get('market-properties/filters', [\App\Http\Controllers\Api\MarketPropertyController::class, 'filters']);
    Route::apiResource('market-properties', \App\Http\Controllers\Api\MarketPropertyController::class);

    // Property Images
    Route::post('properties/{property}/images', [\App\Http\Controllers\Api\PropertyImageController::class, 'store']);
    Route::delete('properties/{property}/images/{image}', [\App\Http\Controllers\Api\PropertyImageController::class, 'destroy']);
    Route::put('properties/{property}/images/{image}/cover', [\App\Http\Controllers\Api\PropertyImageController::class, 'setCover']);
    Route::post('properties/{property}/images/reorder', [\App\Http\Controllers\Api\PropertyImageController::class, 'reorder']);

    // Enums & Features
    Route::get('enums', [\App\Http\Controllers\Api\SystemEnumController::class, 'index']);
    Route::get('features', [\App\Http\Controllers\Api\FeatureController::class, 'index']);

    // Saved Filters (Authenticated, user-scoped)
    Route::apiResource('saved-filters', \App\Http\Controllers\Api\SavedFilterController::class);

    // White-Label Site settings (Branding, agency-scoped to the current user)
    Route::get('site-settings', [\App\Http\Controllers\Api\SiteSettingsController::class, 'show']);
    Route::put('site-settings', [\App\Http\Controllers\Api\SiteSettingsController::class, 'update']);

    // AI Search (Authenticated)
    Route::post('market-properties/ai-search', [\App\Http\Controllers\Api\AiSearchController::class, 'search']);

    // Subscriptions (Authenticated)
    Route::get('/subscriptions/current', [\App\Http\Controllers\Api\SubscriptionController::class, 'current']);
    Route::post('/subscriptions', [\App\Http\Controllers\Api\SubscriptionController::class, 'store']);
    Route::delete('/subscriptions/{id}', [\App\Http\Controllers\Api\SubscriptionController::class, 'destroy']);

    require __DIR__.'/api/user_routes.php';
});

// Platform Admin API (auth:sanctum + platform permissions)
Route::prefix('admin')->group(function () {
    require __DIR__.'/api/admin.php';
});

// White-Label Public Site API (unauthenticated, agency resolved from host)
Route::middleware(\App\Http\Middleware\ResolvePublicAgency::class)
    ->prefix('public')
    ->group(function () {
        Route::get('properties', [\App\Http\Controllers\Api\PublicPropertyController::class, 'index']);
        Route::get('properties/{slug}', [\App\Http\Controllers\Api\PublicPropertyController::class, 'show']);
        Route::post('leads', [\App\Http\Controllers\Api\PublicLeadController::class, 'store'])
            ->middleware('throttle:10,1');
        Route::get('site', [\App\Http\Controllers\Api\PublicSiteController::class, 'show']);
    });

// LLM Chat (Public)
Route::post('/llm/chat', [\App\Http\Controllers\Api\LlmChatController::class, 'chat']);

// Plans (Public)
Route::get('/plans', [\App\Http\Controllers\Api\PlanController::class, 'index']);

// Asaas Webhook (Public POST)
Route::post('/webhooks/asaas', [\App\Http\Controllers\Api\AsaasWebhookController::class, 'handle']);
