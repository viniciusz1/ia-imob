<?php

namespace App\Models\Crawler;

use Illuminate\Database\Eloquent\Model;

class ExtractionProfile extends Model
{
    protected $table = 'crawler.extraction_profiles';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'schemas' => 'array',
            'strategies' => 'array',
            'fields' => 'array',
            'parameters' => 'array',
            'decided_at' => 'datetime',
        ];
    }
}
