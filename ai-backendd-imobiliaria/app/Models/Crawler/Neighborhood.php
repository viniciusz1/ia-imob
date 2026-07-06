<?php

namespace App\Models\Crawler;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Neighborhood extends Model
{
    use HasFactory;

    protected $table = 'crawler.neighborhoods';

    protected $fillable = [
        'city_id',
        'name',
        'slug',
        'aliases',
    ];

    protected $casts = [
        'aliases' => 'array',
    ];

    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class);
    }
}
