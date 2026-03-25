<?php

namespace App\Models;

use App\Enums\BillingType;
use App\Enums\SubscriptionStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TenantSubscription extends Model
{
    protected $fillable = [
        'user_id',
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
            'billing_type'  => BillingType::class,
            'status'        => SubscriptionStatus::class,
            'next_due_date' => 'date',
            'started_at'    => 'datetime',
            'ends_at'       => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(SubscriptionPlan::class, 'plan_id');
    }
}
