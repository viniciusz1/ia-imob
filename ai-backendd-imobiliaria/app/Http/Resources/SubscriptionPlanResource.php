<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SubscriptionPlanResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'name'          => $this->name,
            'slug'          => $this->slug,
            'asaasCycle'    => $this->asaas_cycle->value,
            'pricePerMonth' => (float) $this->price_per_month,
            'totalPrice'    => (float) $this->total_price,
            'description'   => $this->description,
            'isActive'      => (bool) $this->is_active,
        ];
    }
}
