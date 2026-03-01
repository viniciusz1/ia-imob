<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class SystemEnum extends Model
{
    use HasFactory;

    protected $fillable = [
        'tag',
        'data',
    ];

    protected $casts = [
        'data' => 'array',
    ];
}
