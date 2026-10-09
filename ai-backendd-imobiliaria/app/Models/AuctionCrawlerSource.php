<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class AuctionCrawlerSource extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'name',
        'type',
        'config',
        'is_active',
        'last_run_at',
    ];

    protected $casts = [
        'config' => 'array',
        'is_active' => 'boolean',
        'last_run_at' => 'datetime',
    ];

    public function runs(): HasMany
    {
        return $this->hasMany(AuctionCrawlRun::class);
    }

    public function latestRun(): HasOne
    {
        return $this->hasOne(AuctionCrawlRun::class)->latestOfMany();
    }

    public function events(): HasMany
    {
        return $this->hasMany(AuctionEvent::class);
    }
}
