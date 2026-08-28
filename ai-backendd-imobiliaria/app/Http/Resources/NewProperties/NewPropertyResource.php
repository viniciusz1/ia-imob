<?php

namespace App\Http\Resources\NewProperties;

use App\Http\Resources\Api\MarketPropertyResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NewPropertyResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $property = $this->resource['property'];

        return [
            ...(new MarketPropertyResource($property))->toArray($request),
            'title' => $this->resource['title'],
            'purpose' => $this->resource['purpose'],
            'images' => $property->imagem ? [$property->imagem] : [],
            'is_new' => $this->resource['is_new'],
            'new_reason' => $this->resource['new_reason'],
            'history_window_start' => $this->resource['history_window_start'],
            'history_snapshot_count' => $this->resource['history_snapshot_count'],
            'first_seen_in_current_window_at' => $this->resource['first_seen_in_current_window_at'],
            'is_opportunity' => $this->resource['is_opportunity'],
            'opportunity_score' => $this->resource['opportunity_score'],
            'opportunity_reason' => $this->resource['opportunity_reason'],
            'opportunity_explanation' => $this->resource['opportunity_explanation'],
            'price_per_square_meter' => $this->resource['price_per_square_meter'],
            'benchmark_price_per_square_meter' => $this->resource['benchmark_price_per_square_meter'],
            'price_advantage_percentage' => $this->resource['price_advantage_percentage'],
            'comparable_count' => $this->resource['comparable_count'],
            'sample_size_indicator' => $this->resource['sample_size_indicator'],
            'candidate_snapshot_id' => $this->resource['candidate_snapshot_id'],
            'comparable_snapshot_ids' => $this->resource['comparable_snapshot_ids'],
            'comparable_cutoff_at' => $this->resource['comparable_cutoff_at'],
        ];
    }
}
