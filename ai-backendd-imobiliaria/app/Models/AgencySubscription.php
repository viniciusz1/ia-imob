<?php

namespace App\Models;

use App\Enums\BillingType;
use App\Enums\SubscriptionStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AgencySubscription extends Model
{
    protected $fillable = [
        'agency_id',
        'plan_id',
        'asaas_customer_id',
        'asaas_subscription_id',
        'billing_type',
        'status',
        'next_due_date',
        'started_at',
        'ends_at',
    ];

    protected function casts(): array
    {
        return [
            'billing_type' => BillingType::class,
            'status' => SubscriptionStatus::class,
            'next_due_date' => 'date',
            'started_at' => 'datetime',
            'ends_at' => 'datetime',
        ];
    }

    public function agency(): BelongsTo
    {
        return $this->belongsTo(Agency::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(SubscriptionPlan::class, 'plan_id');
    }
}
