<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CrawlerRun extends Model
{
    use HasFactory;

    protected $table = 'crawler.crawler_runs';

    protected $fillable = [
        'source_name',
        'status',
        'started_at',
        'completed_at',
        'error_message',
        'properties_count',
        'latest',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
            'properties_count' => 'integer',
            'latest' => 'boolean',
        ];
    }

    public function marketProperties(): HasMany
    {
        return $this->hasMany(MarketProperty::class);
    }
}
