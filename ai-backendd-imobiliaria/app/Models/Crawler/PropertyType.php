<?php

namespace App\Models\Crawler;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PropertyType extends Model
{
    use HasFactory;

    protected $table = 'crawler.property_types';

    protected $fillable = [
        'name',
        'slug',
        'aliases',
    ];

    protected $casts = [
        'aliases' => 'array',
    ];
}
