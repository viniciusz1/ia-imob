<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AgencyExtractorRefinement extends Model
{
    protected $table = 'agency_extractor_refinements';

    protected $fillable = [
        'user_id',
        'agency_type',
        'agency_id',
        'field_name',
        'agency_onboarding_attempt_id',
        'before',
        'after',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'user_id' => 'integer',
            'agency_id' => 'integer',
            'agency_onboarding_attempt_id' => 'integer',
            'before' => 'array',
            'after' => 'array',
        ];
    }
}
