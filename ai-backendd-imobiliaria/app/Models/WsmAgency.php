<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WsmAgency extends Model
{
    protected $table = 'wsm_agencies';

    protected $fillable = [
        'name',
        'domain',
        'url',
        'url_pagination_template',
        'total_pages_selector_type',
        'total_pages_selector_value',
        'total_pages_formula',
        'cards_to_iterate_selector_type',
        'cards_to_iterate_selector_value',
        'is_active',
        'expected_min_items',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'expected_min_items' => 'integer',
        ];
    }

    public function extractors(): HasMany
    {
        return $this->hasMany(AgencyFieldExtractor::class, 'agency_id')
            ->where('agency_type', 'wsm')
            ->orderBy('field_name')
            ->orderBy('priority');
    }
}
