<?php

namespace App\Models\Concerns;

use App\Models\Tenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Marks a model as tenant-owned: applies the TenantScope global scope and
 * auto-assigns tenant_id on creation from the current Tenant context.
 */
trait BelongsToTenant
{
    public static function bootBelongsToTenant(): void
    {
        static::addGlobalScope(new TenantScope());

        static::creating(function (Model $model) {
            if (empty($model->tenant_id)) {
                $tenantId = static::currentTenantId();

                if ($tenantId !== null) {
                    $model->tenant_id = $tenantId;
                }
            }
        });
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Resolve the current Tenant id: an explicit override (set by the public
     * site when resolving a host) takes priority, otherwise the authenticated
     * user's tenant_id. Returns null when no Tenant is in context.
     */
    public static function currentTenantId(): ?int
    {
        if (app()->bound('currentTenantId')) {
            return app('currentTenantId');
        }

        return auth()->user()?->tenant_id;
    }
}
