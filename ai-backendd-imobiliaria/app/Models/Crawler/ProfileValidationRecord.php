<?php

namespace App\Models\Crawler;

use Illuminate\Database\Eloquent\Model;

class ProfileValidationRecord extends Model
{
    protected $table = 'crawler.profile_validation_records';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'raw_data' => 'array',
            'normalized_data' => 'array',
            'errors' => 'array',
            'field_presence' => 'array',
            'is_valid' => 'boolean',
        ];
    }
}
