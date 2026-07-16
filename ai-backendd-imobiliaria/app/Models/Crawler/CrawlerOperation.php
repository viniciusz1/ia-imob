<?php

namespace App\Models\Crawler;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class CrawlerOperation extends Model
{
    protected $table = 'crawler.operations';

    protected $fillable = [
        'type',
        'state',
        'requested_by',
        'crawl_agency_id',
        'market_data_contract_version_id',
        'plan',
    ];

    protected function casts(): array
    {
        return [
            'plan' => 'array',
            'result' => 'array',
            'heartbeat_at' => 'datetime',
            'lease_expires_at' => 'datetime',
            'claimed_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function crawlAgency(): BelongsTo
    {
        return $this->belongsTo(CrawlAgency::class);
    }

    public function contract(): BelongsTo
    {
        return $this->belongsTo(MarketDataContractVersion::class, 'market_data_contract_version_id');
    }

    public function discoverySnapshot(): HasOne
    {
        return $this->hasOne(DiscoverySnapshot::class, 'operation_id');
    }
}
