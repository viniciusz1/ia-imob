<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\Crawler\CrawlAgency;

class AuctionEvent extends Model
{
    protected $fillable = [
        'crawl_agency_id',
        'external_key',
        'canonical_url',
        'title',
        'sale_modality',
        'status',
        'auctioneer_name',
        'court_or_seller',
        'published_at',
        'source_payload',
        'first_observed_at',
        'last_observed_at',
    ];

    protected $casts = [
        'published_at' => 'datetime',
        'first_observed_at' => 'datetime',
        'last_observed_at' => 'datetime',
        'source_payload' => 'array',
    ];

    public function agency(): BelongsTo
    {
        return $this->belongsTo(CrawlAgency::class, 'crawl_agency_id');
    }

    public function eventProperties(): HasMany
    {
        return $this->hasMany(AuctionEventProperty::class);
    }
}
