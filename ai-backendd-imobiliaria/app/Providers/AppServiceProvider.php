<?php

namespace App\Providers;

use App\Services\Ai\Providers\DeepSeekProvider;
use App\Services\Ai\Providers\LlmProvider;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(LlmProvider::class, function () {
            return match (config('ai.provider', 'deepseek')) {
                'deepseek' => new DeepSeekProvider,
                default => new DeepSeekProvider,
            };
        });
    }

    public function boot(): void
    {
        //
    }
}
