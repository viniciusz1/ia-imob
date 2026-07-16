<?php

namespace App\Models\Crawler;

use Illuminate\Database\Eloquent\Model;

class MarketDataContractVersion extends Model
{
    protected $table = 'crawler.market_data_contract_versions';

    protected $fillable = [
        'version',
        'status',
        'fields',
        'compatibility',
        'affected_agency_ids',
        'created_by',
        'activated_by',
        'activated_at',
    ];

    protected function casts(): array
    {
        return [
            'version' => 'integer',
            'fields' => 'array',
            'affected_agency_ids' => 'array',
            'activated_at' => 'datetime',
        ];
    }
}
