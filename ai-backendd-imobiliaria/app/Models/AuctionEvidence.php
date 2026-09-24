<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuctionEvidence extends Model
{
    protected $table = 'auction_evidences';

    protected $fillable = [
        'auction_event_property_id',
        'kind',
        'url',
        'content_hash',
        'captured_at',
        'artifact_id',
        'metadata',
    ];

    protected $casts = [
        'captured_at' => 'datetime',
        'metadata' => 'array',
    ];

    public function eventProperty(): BelongsTo
    {
        return $this->belongsTo(AuctionEventProperty::class, 'auction_event_property_id');
    }
}
