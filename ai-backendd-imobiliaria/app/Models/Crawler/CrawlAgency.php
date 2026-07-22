<?php

namespace App\Models\Crawler;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CrawlAgency extends Model
{
    use HasFactory;

    protected $table = 'crawler.crawl_agencies';

    protected $fillable = [
        'name',
        'slug',
        'base_url',
        'root_domain',
        'lifecycle_state',
        'health_state',
        'revalidation_required',
        'current_published_crawl_run_id',
    ];

    protected function casts(): array
    {
        return [
            'revalidation_required' => 'boolean',
        ];
    }
}
