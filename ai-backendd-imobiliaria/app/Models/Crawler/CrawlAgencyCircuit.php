<?php

namespace App\Models\Crawler;

use Illuminate\Database\Eloquent\Model;

class CrawlAgencyCircuit extends Model
{
    protected $table = 'crawler.crawl_agency_circuits';

    protected $fillable = [
        'crawl_agency_id', 'state', 'consecutive_failures', 'last_evaluated_operation_id',
        'opened_at', 'closed_at', 'reason',
    ];

    protected function casts(): array
    {
        return [
            'consecutive_failures' => 'integer',
            'opened_at' => 'datetime',
            'closed_at' => 'datetime',
        ];
    }
}
