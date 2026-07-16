<?php

namespace App\Models\Crawler;

use Illuminate\Database\Eloquent\Model;

class CrawlAgencySchedule extends Model
{
    protected $table = 'crawler.crawl_agency_schedules';

    protected $fillable = [
        'crawl_agency_id', 'inherit_default', 'preset', 'timezone', 'next_run_at',
        'last_enqueued_at', 'suspended_at', 'suspension_reason', 'created_by', 'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'inherit_default' => 'boolean',
            'next_run_at' => 'datetime',
            'last_enqueued_at' => 'datetime',
            'suspended_at' => 'datetime',
        ];
    }
}
