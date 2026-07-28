<?php

namespace App\Models\Crawler;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OnboardingExecutionModelVersion extends Model
{
    protected $table = 'crawler.onboarding_execution_model_versions';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['version' => 'integer'];
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
}
