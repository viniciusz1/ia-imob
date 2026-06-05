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

    /**
     * The Tenant's current subscription. Interim: subscriptions are still
     * user-keyed (tenant-keying is deferred — see GitHub #9), so we read the
     * owner's latest subscription. When #9 lands, only this method changes.
     */
    public function currentSubscription(): ?TenantSubscription
    {
        return $this->owner?->subscriptions()->latest('id')->first();
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
