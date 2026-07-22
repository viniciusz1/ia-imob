<?php

namespace App\Models\Crawler;

use Illuminate\Database\Eloquent\Model;

class RejectedProperty extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'crawler.rejected_properties';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['payload' => 'array', 'missing_fields' => 'array', 'errors' => 'array'];
    }
}
