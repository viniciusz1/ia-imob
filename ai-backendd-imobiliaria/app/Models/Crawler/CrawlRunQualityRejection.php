<?php

namespace App\Models\Crawler;

use App\Models\CrawlerRun;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use LogicException;

class CrawlRunQualityRejection extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'crawler.crawl_run_quality_rejections';

    protected $fillable = [
        'crawl_run_id',
        'quality_gate_report_id',
        'rejected_by',
        'reason',
        'rejected_at',
    ];

    protected function casts(): array
    {
        return ['rejected_at' => 'datetime'];
    }

    protected static function booted(): void
    {
        static::updating(fn () => throw new LogicException('Crawl Run quality rejections are immutable.'));
        static::deleting(fn () => throw new LogicException('Crawl Run quality rejections are immutable.'));
    }

    public function crawlRun(): BelongsTo
    {
        return $this->belongsTo(CrawlerRun::class, 'crawl_run_id');
    }

    public function qualityGateReport(): BelongsTo
    {
        return $this->belongsTo(QualityGateReport::class, 'quality_gate_report_id');
    }

    public function rejectedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rejected_by');
    }
}
