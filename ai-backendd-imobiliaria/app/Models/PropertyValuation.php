<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PropertyValuation extends Model
{
    use BelongsToTenant, HasFactory;

    public const STATUS_CALCULATED = 'calculated';

    public const STATUS_INSUFFICIENT_SAMPLE = 'insufficient_sample';

    protected $fillable = [
        'tenant_id',
        'user_id',
        'code',
        'status',
        'city',
        'neighborhood',
        'residential_type',
        'area',
        'bedrooms',
        'bathrooms',
        'garage_spaces',
        'flood_risk',
        'base_min_value',
        'base_central_value',
        'base_max_value',
        'final_min_value',
        'final_central_value',
        'final_max_value',
        'flood_adjustment_percent',
        'sample_summary',
        'comparable_evidence',
    ];

    protected $casts = [
        'area' => 'decimal:2',
        'bedrooms' => 'integer',
        'bathrooms' => 'integer',
        'garage_spaces' => 'integer',
        'flood_risk' => 'boolean',
        'city' => 'array',
        'neighborhood' => 'array',
        'base_min_value' => 'decimal:2',
        'base_central_value' => 'decimal:2',
        'base_max_value' => 'decimal:2',
        'final_min_value' => 'decimal:2',
        'final_central_value' => 'decimal:2',
        'final_max_value' => 'decimal:2',
        'flood_adjustment_percent' => 'integer',
        'sample_summary' => 'array',
        'comparable_evidence' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
