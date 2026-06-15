<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

/**
 * Restricts a agency-owned model to the current Agency.
 *
 * The current Agency is resolved by the host model's currentAgencyId():
 * an explicit override (public site) takes priority, otherwise the
 * authenticated user's agency_id. When no Agency can be resolved
 * (CLI, seeders, unauthenticated requests with no override), no
 * constraint is applied.
 */
class AgencyScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $agencyId = $model::currentAgencyId();

        if ($agencyId !== null) {
            $builder->where($model->getTable().'.agency_id', $agencyId);
        }
    }
}
