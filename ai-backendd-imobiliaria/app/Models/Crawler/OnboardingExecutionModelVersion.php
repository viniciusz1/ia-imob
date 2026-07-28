<?php

namespace App\Models\Crawler;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use LogicException;

class OnboardingExecutionModelVersion extends Model
{
    protected $table = 'crawler.onboarding_execution_model_versions';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'version' => 'integer',
            'is_default' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::updating(function (self $version): void {
            if ($version->getOriginal('status') === 'draft') {
                return;
            }

            $contentChanges = array_diff(
                array_keys($version->getDirty()),
                ['status', 'is_default', 'updated_at'],
            );
            if ($contentChanges !== []) {
                throw new LogicException('Available or archived Onboarding Model versions are immutable.');
            }
        });
    }

    public function discoveryPolicy(): BelongsTo
    {
        return $this->belongsTo(DiscoveryPolicyVersion::class, 'discovery_policy_version_id');
    }

    public function extractionPolicy(): BelongsTo
    {
        return $this->belongsTo(ExtractionPolicyVersion::class, 'extraction_policy_version_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function onboardingPlans(): HasMany
    {
        return $this->hasMany(OnboardingPlan::class, 'execution_model_version_id');
    }

    public function onboardingExecutions(): HasMany
    {
        return $this->hasMany(OnboardingExecution::class, 'execution_model_version_id');
    }
}
