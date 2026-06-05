<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SitemapAgency extends Model
{
    protected $table = 'sitemap_agencies';

    protected $fillable = [
        'name',
        'domain',
        'sitemap_url',
        'allowed_url_patterns',
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
            ->where('agency_type', 'sitemap')
            ->orderBy('field_name')
            ->orderBy('priority');
    }
}
