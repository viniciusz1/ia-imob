<?php

namespace App\Models\Crawler;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OnboardingPlan extends Model
{
    protected $table = 'crawler.onboarding_plans';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'steps' => 'array',
            'confirmed_at' => 'datetime',
        ];
    }

    public function executionModel(): BelongsTo
    {
        return $this->belongsTo(OnboardingExecutionModelVersion::class, 'execution_model_version_id');
    }

    public function executions(): HasMany
    {
        return $this->hasMany(OnboardingExecution::class);
    }
}
