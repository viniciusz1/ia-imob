<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiParseCache extends Model
{
    protected $table = 'ai_parse_cache';

    protected $fillable = [
        'cache_key',
        'prompt',
        'context_city',
        'filters',
        'schema_version',
        'user_id',
        'cache_hit',
    ];

    protected function casts(): array
    {
        return [
            'filters' => 'array',
            'cache_hit' => 'boolean',
        ];
    }
}
