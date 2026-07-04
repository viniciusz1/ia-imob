<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PropertyImage extends Model
{
    use HasFactory;

    protected $fillable = [
        'property_id',
        'path',
        'is_cover',
        'order',
        'description',
    ];

    protected $casts = [
        'is_cover' => 'boolean',
    ];

    public function property()
    {
        return $this->belongsTo(Property::class);
    }
}
