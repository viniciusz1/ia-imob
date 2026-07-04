<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

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
