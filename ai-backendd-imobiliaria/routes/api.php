<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\PermissionController;
use Illuminate\Http\Request;
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
    Route::get('scrapy-properties/filters', [\App\Http\Controllers\Api\ScrapyPropertyController::class, 'filters']);
    Route::apiResource('scrapy-properties', \App\Http\Controllers\Api\ScrapyPropertyController::class);

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

    // AI Search (Authenticated)
    Route::post('scrapy-properties/ai-search', [\App\Http\Controllers\Api\AiSearchController::class, 'search']);

    // Subscriptions (Authenticated)
    Route::get('/subscriptions/current', [\App\Http\Controllers\Api\SubscriptionController::class, 'current']);
    Route::post('/subscriptions', [\App\Http\Controllers\Api\SubscriptionController::class, 'store']);
    Route::delete('/subscriptions/{id}', [\App\Http\Controllers\Api\SubscriptionController::class, 'destroy']);

    require __DIR__ . '/api/user_routes.php';
});

// Plans (Public)
Route::get('/plans', [\App\Http\Controllers\Api\PlanController::class, 'index']);

// Asaas Webhook (Public POST)
Route::post('/webhooks/asaas', [\App\Http\Controllers\Api\AsaasWebhookController::class, 'handle']);
