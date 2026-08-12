<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AgencyConfiguration extends Model
{
    public const DEFAULT_MARKET_SEARCH_WEEKLY_LIMIT = 100;

    protected $fillable = [
        'agency_id',
        'market_search_weekly_limit',
    ];

    protected function casts(): array
    {
        return [
            'market_search_weekly_limit' => 'integer',
        ];
    }

    public function agency(): BelongsTo
    {
        return $this->belongsTo(Agency::class);
    }
}
