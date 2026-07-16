<?php

namespace App\Models\Crawler;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ExtractionProfile extends Model
{
    protected $table = 'crawler.extraction_profiles';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'schemas' => 'array',
            'strategies' => 'array',
            'fields' => 'array',
            'parameters' => 'array',
            'decided_at' => 'datetime',
            'activated_at' => 'datetime',
        ];
    }

    public function crawlAgency(): BelongsTo
    {
        return $this->belongsTo(CrawlAgency::class);
    }

    public function discoverySnapshot(): BelongsTo
    {
        return $this->belongsTo(DiscoverySnapshot::class);
    }

    public function contract(): BelongsTo
    {
        return $this->belongsTo(MarketDataContractVersion::class, 'market_data_contract_version_id');
    }

    public function validationReports(): HasMany
    {
        return $this->hasMany(ProfileValidationReport::class);
    }
}
