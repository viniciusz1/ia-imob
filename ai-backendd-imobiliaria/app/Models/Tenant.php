<?php

namespace App\Models;

use App\Enums\SubscriptionStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Tenant extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'owner_user_id',
        'asaas_customer_id',
    ];

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function properties(): HasMany
    {
        return $this->hasMany(Property::class);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }

    public function siteSettings(): HasOne
    {
        return $this->hasOne(TenantSiteSettings::class);
    }

    public function domains(): HasMany
    {
        return $this->hasMany(TenantDomain::class);
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(TenantSubscription::class);
    }

    /**
     * The Tenant's latest subscription. Billing is keyed to the agency, not to
     * the individual Broker who initiated the checkout.
     */
    public function currentSubscription(): ?TenantSubscription
    {
        return $this->subscriptions()->latest('id')->first();
    }

    public function hasActiveSubscription(): bool
    {
        return $this->currentSubscription()?->status === SubscriptionStatus::Active;
    }

    /**
     * Whether/how the public site is served (ADR-0004): 'live' and 'preview'
     * are served; 'lapsed' -> 503; 'gone' -> 404. A Tenant with no subscription
     * is treated as 'preview' (e.g. onboarding before first payment).
     */
    public function publicSiteState(): string
    {
        $subscription = $this->currentSubscription();

        if ($subscription === null) {
            return 'preview';
        }

        return match ($subscription->status) {
            SubscriptionStatus::Active => 'live',
            SubscriptionStatus::Pending => 'preview',
            SubscriptionStatus::Inactive, SubscriptionStatus::Expired => 'lapsed',
            SubscriptionStatus::Cancelled => 'gone',
        };
    }
}
