<?php

namespace App\Models\Crawler;

use Illuminate\Database\Eloquent\Model;

class ListingVersion extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'crawler.listing_versions';

    protected $fillable = [
        'listing_identity_id',
        'crawl_run_id',
        'market_property_id',
        'classification',
        'content_hash',
        'observed_payload',
        'absence_count',
        'reason',
        'observed_at',
    ];

    protected function casts(): array
    {
        return [
            'observed_payload' => 'array',
            'absence_count' => 'integer',
            'observed_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::updating(fn () => throw new \LogicException('Listing versions are immutable.'));
        static::deleting(fn () => throw new \LogicException('Listing versions are immutable.'));
    }
}
