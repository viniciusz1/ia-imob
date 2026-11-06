<?php

use App\Http\Controllers\Api\Analytics\AuctionAnalyticsController;
use App\Http\Controllers\Api\Analytics\MarketOverviewController;
use App\Http\Controllers\Api\Analytics\MarketPricingController;
use App\Http\Controllers\Api\Analytics\MarketRankingsController;
use App\Http\Controllers\Api\Analytics\ValuationAnalyticsController;
use App\Http\Middleware\EnsureAgencyIsActive;
use App\Http\Middleware\EnsureAgencyUser;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', EnsureAgencyIsActive::class, EnsureAgencyUser::class, 'can:analytics.market.view'])
    ->prefix('analytics/market')
    ->group(function (): void {
        Route::get('/overview', MarketOverviewController::class);
        Route::get('/pricing', MarketPricingController::class);
        Route::get('/rankings', MarketRankingsController::class);
    });

Route::middleware(['auth:sanctum', EnsureAgencyIsActive::class, EnsureAgencyUser::class, 'can:analytics.market.view'])
    ->get('analytics/valuations', ValuationAnalyticsController::class);

Route::middleware(['auth:sanctum', EnsureAgencyIsActive::class, EnsureAgencyUser::class, 'can:analytics.market.view'])
    ->get('analytics/auctions', AuctionAnalyticsController::class);
