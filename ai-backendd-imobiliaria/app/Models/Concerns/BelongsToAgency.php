<?php

namespace App\Models\Concerns;

use App\Models\Agency;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Marks a model as agency-owned: applies the AgencyScope global scope and
 * auto-assigns agency_id on creation from the current Agency context.
 */
trait BelongsToAgency
{
    public static function bootBelongsToAgency(): void
    {
        static::addGlobalScope(new AgencyScope);

        static::creating(function (Model $model) {
            if (empty($model->agency_id)) {
                $agencyId = static::currentAgencyId();

                if ($agencyId !== null) {
                    $model->agency_id = $agencyId;
                }
            }
        });
    }

    public function agency(): BelongsTo
    {
        return $this->belongsTo(Agency::class);
    }

    /**
     * Resolve the current Agency id: an explicit override (set by the public
     * site when resolving a host) takes priority, otherwise the authenticated
     * user's agency_id. Returns null when no Agency is in context.
     */
    public static function currentAgencyId(): ?int
    {
        if (app()->bound('currentAgencyId')) {
            return app('currentAgencyId');
        }

        return auth()->user()?->agency_id;
    }
}
