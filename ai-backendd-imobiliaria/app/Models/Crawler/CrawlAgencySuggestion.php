<?php

namespace App\Models\Crawler;

use Illuminate\Database\Eloquent\Model;

class CrawlAgencySuggestion extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'crawler.crawl_agency_suggestions';

    protected $fillable = ['crawl_agency_id', 'operation_id', 'differences', 'state'];

    protected function casts(): array
    {
        return ['differences' => 'array'];
    }
}
