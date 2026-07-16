<?php

namespace App\Models\Crawler;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Prospect extends Model
{
    protected $table = 'crawler.prospects';

    protected $fillable = [
        'root_domain',
        'google_place_id',
        'name',
        'city',
        'state',
        'base_url',
        'phone',
        'address',
        'source',
        'automatic_classification',
        'automatic_reason',
        'review_state',
        'reviewed_by',
        'reviewed_at',
        'review_reason',
        'promoted_crawl_agency_id',
        'latest_operation_id',
        'metadata',
    ];

    protected function casts(): array
    {
        return ['reviewed_at' => 'datetime', 'metadata' => 'array'];
    }

    public function onboardingPlan(): HasOne
    {
        return $this->hasOne(OnboardingPlan::class);
    }

    public function promotedAgency(): BelongsTo
    {
        return $this->belongsTo(CrawlAgency::class, 'promoted_crawl_agency_id');
    }
}
