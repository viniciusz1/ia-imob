<?php

namespace App\Models;

use App\Enums\AsaasCycle;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SubscriptionPlan extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'asaas_cycle',
        'price_per_month',
        'total_price',
        'description',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'asaas_cycle' => AsaasCycle::class,
            'is_active' => 'boolean',
            'price_per_month' => 'decimal:2',
            'total_price' => 'decimal:2',
        ];
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(AgencySubscription::class, 'plan_id');
    }
}
