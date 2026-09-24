<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AuctionEventProperty extends Model
{
    protected $fillable = [
        'auction_event_id',
        'auction_property_id',
        'listing_identity_id',
        'lot_number',
        'canonical_url',
        'inventory_state',
        'current_round_id',
        'observed_at',
    ];

    protected $casts = [
        'observed_at' => 'datetime',
    ];

    public function event(): BelongsTo
    {
        return $this->belongsTo(AuctionEvent::class, 'auction_event_id');
    }

    public function property(): BelongsTo
    {
        return $this->belongsTo(AuctionProperty::class, 'auction_property_id');
    }

    public function rounds(): HasMany
    {
        return $this->hasMany(AuctionRound::class);
    }

    public function currentRound(): BelongsTo
    {
        return $this->belongsTo(AuctionRound::class, 'current_round_id');
    }

    public function evidences(): HasMany
    {
        return $this->hasMany(AuctionEvidence::class);
    }
}
