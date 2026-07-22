<?php

namespace App\Models\Crawler;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ListingIdentity extends Model
{
    protected $table = 'crawler.listing_identities';

    protected $fillable = [
        'crawl_agency_id',
        'listing_key',
        'external_id',
        'canonical_url',
        'inventory_state',
        'consecutive_absences',
        'absence_reason',
        'current_version_id',
        'current_market_property_id',
        'last_seen_crawl_run_id',
        'last_observed_at',
    ];

    protected function casts(): array
    {
        return [
            'consecutive_absences' => 'integer',
            'last_observed_at' => 'datetime',
        ];
    }

    public function versions(): HasMany
    {
        return $this->hasMany(ListingVersion::class);
    }
}
