<?php

namespace App\Models\Crawler;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProfileValidationReport extends Model
{
    protected $table = 'crawler.profile_validation_reports';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'valid_ratio' => 'float',
            'required_field_coverage' => 'array',
            'blocking_failures' => 'array',
            'warnings' => 'array',
            'eligible' => 'boolean',
        ];
    }

    public function records(): HasMany
    {
        return $this->hasMany(ProfileValidationRecord::class, 'profile_validation_report_id');
    }
}
