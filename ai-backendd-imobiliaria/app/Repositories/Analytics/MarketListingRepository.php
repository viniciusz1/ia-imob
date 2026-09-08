<?php

namespace App\Repositories\Analytics;

use App\Domain\Analytics\MarketAnalyticsFilters;
use App\Domain\Analytics\PriceMetric;
use App\Domain\Analytics\PropertyTypeNormalizer;
use App\Domain\Analytics\SupplyField;
use Illuminate\Support\Collection;

class MarketListingRepository
{
    public function __construct(
        private readonly MarketStockQuery $stock,
        private readonly MarketPriceRepository $prices,
    ) {}

    /**
     * @return Collection<int, array<string, mixed>>
     */
    public function rankedBy(
        MarketAnalyticsFilters $filters,
        PriceMetric $metric,
        string $direction,
        int $limit,
        bool $withinFence = false,
    ): Collection {
        $expression = $this->stock->metric($metric);
        $query = $this->stock->forMetric($filters, $metric)->getQuery();

        if ($withinFence) {
            $fence = $this->prices->fenceFor($filters, $metric);

            if ($fence === null) {
                return collect();
            }

            $query->whereRaw("{$expression} between ? and ?", $fence);
        }

        return $query
            ->selectRaw($this->selection($expression))
            ->orderByRaw("{$expression} {$this->safeDirection($direction)}")
            ->limit($limit)
            ->get()
            ->map(fn (object $row): array => $this->present($row));
    }

    private function selection(string $expression): string
    {
        return implode(', ', [
            MarketStockQuery::PROPERTIES.'.id as id',
            $this->stock->column(SupplyField::Type).' as raw_type',
            $this->stock->column(SupplyField::Price).' as price',
            $this->stock->column(SupplyField::Area).' as area',
            $this->stock->column(SupplyField::Neighbourhood).' as neighbourhood',
            $this->stock->column(SupplyField::City).' as city',
            $this->stock->column(SupplyField::ListingUrl).' as listing_url',
            MarketStockQuery::AGENCY.'.name as agency',
            "{$expression} as metric_value",
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function present(object $row): array
    {
        return [
            'id' => (int) $row->id,
            'type' => PropertyTypeNormalizer::canonicalName($row->raw_type),
            'price' => $row->price === null ? null : round((float) $row->price, 2),
            'area' => $row->area === null ? null : round((float) $row->area, 2),
            'price_per_square_metre' => $row->area > 0 ? round((float) $row->price / (float) $row->area, 2) : null,
            'neighbourhood' => $row->neighbourhood,
            'city' => $row->city,
            'agency' => $row->agency,
            'listing_url' => $row->listing_url,
        ];
    }

    private function safeDirection(string $direction): string
    {
        return strtolower($direction) === 'asc' ? 'asc' : 'desc';
    }
}
