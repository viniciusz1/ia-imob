<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CrawlerRun extends Model
{
    use HasFactory;

    protected $table = 'crawler.crawl_runs';

    protected $fillable = [
        'operation_id',
        'crawl_agency_id',
        'discovery_snapshot_id',
        'extraction_profile_id',
        'market_data_contract_version_id',
        'quality_policy_version_id',
        'technical_state',
        'result_kind',
        'publication_state',
        'publishable',
        'started_at',
        'completed_at',
        'raw_count',
        'normalized_count',
        'rejected_count',
        'error_count',
        'error_summary',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
            'publishable' => 'boolean',
            'raw_count' => 'integer',
            'normalized_count' => 'integer',
            'rejected_count' => 'integer',
            'error_count' => 'integer',
            'error_summary' => 'array',
        ];
    }

    public function marketProperties(): HasMany
    {
        return $this->hasMany(MarketProperty::class);
    }
}
