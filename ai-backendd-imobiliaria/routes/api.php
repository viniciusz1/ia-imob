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

    // Property Images
    Route::post('properties/{property}/images', [\App\Http\Controllers\Api\PropertyImageController::class, 'store']);
    Route::delete('properties/{property}/images/{image}', [\App\Http\Controllers\Api\PropertyImageController::class, 'destroy']);
    Route::put('properties/{property}/images/{image}/cover', [\App\Http\Controllers\Api\PropertyImageController::class, 'setCover']);
    Route::post('properties/{property}/images/reorder', [\App\Http\Controllers\Api\PropertyImageController::class, 'reorder']);

    // Enums & Features
    Route::get('enums', [\App\Http\Controllers\Api\SystemEnumController::class, 'index']);
    Route::get('features', [\App\Http\Controllers\Api\FeatureController::class, 'index']);

    require __DIR__ . '/api/user_routes.php';
});
