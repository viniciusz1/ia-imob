<?php

namespace App\Http\Resources\Crawler;

use App\Models\Crawler\CrawlAgency;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MarketDataContractResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $affectedIds = $this->affected_agency_ids ?? [];

        return [
            'id' => $this->id,
            'version' => $this->version,
            'status' => $this->status,
            'fields' => $this->fields,
            'compatibility' => $this->compatibility,
            'affected_agencies' => CrawlAgency::query()
                ->whereIn('id', $affectedIds)
                ->orderBy('name')
                ->get(['id', 'name', 'root_domain'])
                ->map(fn (CrawlAgency $agency): array => [
                    'id' => $agency->id,
                    'name' => $agency->name,
                    'root_domain' => $agency->root_domain,
                ])
                ->all(),
            'created_by' => $this->created_by,
            'activated_by' => $this->activated_by,
            'activated_at' => $this->activated_at,
            'created_at' => $this->created_at,
        ];
    }
}
