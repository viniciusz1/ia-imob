<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TenantSubscriptionResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id'                  => $this->id,
            'plan'                => new SubscriptionPlanResource($this->plan),
            'billingType'         => $this->billing_type->value,
            'status'              => $this->status->value,
            'nextDueDate'         => $this->next_due_date?->format('Y-m-d'),
            'startedAt'           => $this->started_at?->toIso8601String(),
            'endsAt'              => $this->ends_at?->toIso8601String(),
            'asaasSubscriptionId' => $this->asaas_subscription_id,
        ];
    }
}
