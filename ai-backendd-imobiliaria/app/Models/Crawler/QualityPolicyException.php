<?php

namespace App\Models\Crawler;

use Illuminate\Database\Eloquent\Model;

class QualityPolicyException extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'crawler.quality_policy_exceptions';

    protected $fillable = ['crawl_agency_id', 'quality_gate_report_id', 'created_by', 'reason'];

    protected static function booted(): void
    {
        static::updating(fn () => throw new \LogicException('Quality exceptions are immutable.'));
        static::deleting(fn () => throw new \LogicException('Quality exceptions are immutable.'));
    }
}
