<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AgencyFieldExtractor extends Model
{
    protected $table = 'agency_field_extractors';

    protected $fillable = [
        'agency_type',
        'agency_id',
        'field_name',
        'priority',
        'source_type',
        'selector_value',
        'selector_index',
        'selector_params',
        'selector_join',
        'pipeline',
        'output_type',
        'is_optional',
    ];

    protected function casts(): array
    {
        return [
            'agency_id' => 'integer',
            'priority' => 'integer',
            'selector_index' => 'integer',
            'selector_params' => 'array',
            'selector_join' => 'boolean',
            'is_optional' => 'boolean',
        ];
    }
}
