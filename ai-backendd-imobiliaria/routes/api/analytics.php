<?php

use App\Http\Controllers\Api\Analytics\MarketOverviewController;
use App\Http\Controllers\Api\Analytics\MarketPricingController;
use App\Http\Controllers\Api\Analytics\MarketRankingsController;
use App\Http\Middleware\EnsureAgencyIsActive;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', EnsureAgencyIsActive::class, 'can:analytics.market.view'])
    ->prefix('analytics/market')
    ->group(function (): void {
        Route::get('/overview', MarketOverviewController::class);
        Route::get('/pricing', MarketPricingController::class);
        Route::get('/rankings', MarketRankingsController::class);
    });
