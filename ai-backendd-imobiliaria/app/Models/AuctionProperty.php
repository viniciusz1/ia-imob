<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AuctionProperty extends Model
{
    protected $fillable = [
        'property_key',
        'property_type',
        'title',
        'description',
        'address',
        'neighborhood',
        'city',
        'state',
        'postal_code',
        'latitude',
        'longitude',
        'built_area_m2',
        'land_area_m2',
        'occupancy_status',
        'registration_number',
        'source_payload',
    ];

    protected $casts = [
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
        'built_area_m2' => 'decimal:2',
        'land_area_m2' => 'decimal:2',
        'source_payload' => 'array',
    ];

    public function eventProperties(): HasMany
    {
        return $this->hasMany(AuctionEventProperty::class);
    }
}
