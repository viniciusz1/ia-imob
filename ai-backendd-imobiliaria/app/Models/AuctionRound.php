<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuctionRound extends Model
{
    protected $fillable = [
        'auction_event_property_id',
        'round_number',
        'starts_at',
        'ends_at',
        'appraisal_value',
        'minimum_bid',
        'current_bid',
        'commission_rate',
        'status',
        'source_label',
        'source_payload',
    ];

    protected $casts = [
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'appraisal_value' => 'decimal:2',
        'minimum_bid' => 'decimal:2',
        'current_bid' => 'decimal:2',
        'commission_rate' => 'decimal:2',
        'source_payload' => 'array',
    ];

    public function eventProperty(): BelongsTo
    {
        return $this->belongsTo(AuctionEventProperty::class, 'auction_event_property_id');
    }
}
