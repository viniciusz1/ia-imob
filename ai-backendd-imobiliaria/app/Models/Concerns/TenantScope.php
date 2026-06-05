<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

/**
 * Restricts a tenant-owned model to the current Tenant.
 *
 * The current Tenant is resolved by the host model's currentTenantId():
 * an explicit override (public site) takes priority, otherwise the
 * authenticated user's tenant_id. When no Tenant can be resolved
 * (CLI, seeders, unauthenticated requests with no override), no
 * constraint is applied.
 */
class TenantScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $tenantId = $model::currentTenantId();

        if ($tenantId !== null) {
            $builder->where($model->getTable() . '.tenant_id', $tenantId);
        }
    }
}
