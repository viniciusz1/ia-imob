<?php

namespace App\Models\Crawler;

use Illuminate\Database\Eloquent\Model;

class RawProperty extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'crawler.raw_properties';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['payload' => 'array', 'extraction_trace' => 'array', 'errors' => 'array'];
    }
}
