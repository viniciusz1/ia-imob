<?php

namespace App\Models\Crawler;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QualityGateReport extends Model
{
    protected $table = 'crawler.quality_gate_reports';

    protected $fillable = [
        'crawl_run_id',
        'market_data_contract_version_id',
        'quality_policy_version_id',
        'verdict',
        'blockers',
        'warnings',
        'evidence',
        'evaluated_at',
    ];

    protected function casts(): array
    {
        return [
            'blockers' => 'array',
            'warnings' => 'array',
            'evidence' => 'array',
            'evaluated_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::updating(fn () => throw new \LogicException('Quality gate reports are immutable.'));
        static::deleting(fn () => throw new \LogicException('Quality gate reports are immutable.'));
    }

    public function crawlRun(): BelongsTo
    {
        return $this->belongsTo(\App\Models\CrawlerRun::class, 'crawl_run_id');
    }
}
