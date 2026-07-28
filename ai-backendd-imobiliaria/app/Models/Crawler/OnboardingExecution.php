<?php

namespace App\Models\Crawler;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OnboardingExecution extends Model
{
    protected $table = 'crawler.onboarding_executions';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'resolved_configuration' => 'array',
            'sample_url_selection' => 'array',
            'started_at' => 'datetime',
            'paused_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function onboardingPlan(): BelongsTo
    {
        return $this->belongsTo(OnboardingPlan::class);
    }

    public function crawlAgency(): BelongsTo
    {
        return $this->belongsTo(CrawlAgency::class);
    }

    public function executionModel(): BelongsTo
    {
        return $this->belongsTo(OnboardingExecutionModelVersion::class, 'execution_model_version_id');
    }

    public function discoveryPolicy(): BelongsTo
    {
        return $this->belongsTo(DiscoveryPolicyVersion::class, 'discovery_policy_version_id');
    }

    public function extractionPolicy(): BelongsTo
    {
        return $this->belongsTo(ExtractionPolicyVersion::class, 'extraction_policy_version_id');
    }

    public function contract(): BelongsTo
    {
        return $this->belongsTo(MarketDataContractVersion::class, 'market_data_contract_version_id');
    }

    public function discoverySnapshot(): BelongsTo
    {
        return $this->belongsTo(DiscoverySnapshot::class);
    }

    public function operations(): HasMany
    {
        return $this->hasMany(CrawlerOperation::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
