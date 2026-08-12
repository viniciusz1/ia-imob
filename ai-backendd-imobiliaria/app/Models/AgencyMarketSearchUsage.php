<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AgencyMarketSearchUsage extends Model
{
    protected $fillable = [
        'agency_id',
        'week_started_on',
        'used_count',
    ];

    protected function casts(): array
    {
        return [
            'week_started_on' => 'date',
            'used_count' => 'integer',
        ];
    }

    public function agency(): BelongsTo
    {
        return $this->belongsTo(Agency::class);
    }
}
