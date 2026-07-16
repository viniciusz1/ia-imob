<?php

namespace App\Models\Crawler;

use Illuminate\Database\Eloquent\Model;

class ExceptionalPublication extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'crawler.exceptional_publications';

    protected $fillable = ['crawl_run_id', 'quality_gate_report_id', 'published_by', 'reason', 'published_at'];

    protected function casts(): array
    {
        return ['published_at' => 'datetime'];
    }

    protected static function booted(): void
    {
        static::updating(fn () => throw new \LogicException('Exceptional publications are immutable.'));
        static::deleting(fn () => throw new \LogicException('Exceptional publications are immutable.'));
    }
}
