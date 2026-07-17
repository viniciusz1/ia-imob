<?php

namespace App\Providers;

use App\Models\AgencySiteSettings;
use App\Models\Property;
use App\Observers\AgencySiteSettingsObserver;
use App\Observers\PropertyObserver;
use App\Repositories\CatalogRepository;
use App\Repositories\Contracts\CatalogRepositoryInterface;
use App\Repositories\Contracts\MarketPropertyRepositoryInterface;
use App\Repositories\Contracts\NeighborhoodGeometryRepositoryInterface;
use App\Repositories\MarketPropertyRepository;
use App\Repositories\NeighborhoodGeometryRepository;
use App\Services\Ai\Providers\DeepSeekProvider;
use App\Services\Ai\Providers\LlmProvider;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(MarketPropertyRepositoryInterface::class, MarketPropertyRepository::class);
        $this->app->bind(CatalogRepositoryInterface::class, CatalogRepository::class);
        $this->app->bind(NeighborhoodGeometryRepositoryInterface::class, NeighborhoodGeometryRepository::class);

        $this->app->bind(LlmProvider::class, function () {
            return match (config('ai.provider', 'deepseek')) {
                'deepseek' => new DeepSeekProvider,
                default => new DeepSeekProvider,
            };
        });
    }

    public function boot(): void
    {
        Property::observe(PropertyObserver::class);
        AgencySiteSettings::observe(AgencySiteSettingsObserver::class);
    }
}
