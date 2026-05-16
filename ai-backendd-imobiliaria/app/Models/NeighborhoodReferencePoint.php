<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NeighborhoodReferencePoint extends Model
{
    protected $fillable = [
        'osm_type',
        'osm_id',
        'name',
        'city',
        'state',
        'lat',
        'lng',
        'aliases',
        'raw_tags',
        'imported_at',
    ];

    protected $casts = [
        'lat' => 'float',
        'lng' => 'float',
        'aliases' => 'array',
        'raw_tags' => 'array',
        'imported_at' => 'datetime',
    ];
}
