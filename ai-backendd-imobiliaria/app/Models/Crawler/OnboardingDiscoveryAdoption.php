<?php

namespace App\Models\Crawler;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OnboardingDiscoveryAdoption extends Model
{
    protected $table = 'crawler.onboarding_discovery_adoptions';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'original_discovery_configuration' => 'array',
            'adopted_at' => 'datetime',
        ];
    }

    public function execution(): BelongsTo
    {
        return $this->belongsTo(OnboardingExecution::class, 'onboarding_execution_id');
    }

    public function snapshot(): BelongsTo
    {
        return $this->belongsTo(DiscoverySnapshot::class, 'discovery_snapshot_id');
    }

    public function sourceOperation(): BelongsTo
    {
        return $this->belongsTo(CrawlerOperation::class, 'source_operation_id');
    }

    public function replacedOperation(): BelongsTo
    {
        return $this->belongsTo(CrawlerOperation::class, 'replaced_operation_id');
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'adopted_by');
    }
}
