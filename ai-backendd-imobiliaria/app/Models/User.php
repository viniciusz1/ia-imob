<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes, HasRoles;

    protected $guard_name = 'web';


    protected $fillable = [
        'tenant_id',
        'name', 'email', 'phone', 'creci', 'order', 'person_type',
        'group_id', 'team_id', 'username', 'password', 'avatar_path',
        'is_active', 'show_on_website', 'has_broker_page',
        'work_period_1_start', 'work_period_1_end',
        'work_period_2_start', 'work_period_2_end',
        'website_name', 'facebook_link', 'instagram_link',
        'description', 'notes', 'last_seen_at',
        'asaas_customer_id',
    ];

    protected $hidden = [
        'password', 'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'show_on_website' => 'boolean',
            'has_broker_page' => 'boolean',
            'order' => 'integer',
            'password' => 'hashed',
            'last_seen_at' => 'datetime',
        ];
    }

    /*
     public function group() { return $this->belongsTo(Group::class); }
     public function team() { return $this->belongsTo(Team::class); }
     */

    public function scopeOnline(Builder $query): Builder
    {
        return $query->where('last_seen_at', '>=', now()->subMinutes(5));
    }

    public function tenant(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function subscriptions(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(TenantSubscription::class, 'user_id');
    }

    public function savedFilters(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(SavedFilter::class, 'user_id');
    }
}
