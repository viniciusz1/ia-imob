<?php

namespace App\Services\Analytics;

use App\Domain\Analytics\AuctionPropertyType;
use App\Domain\Analytics\MarketAnalyticsFilters;
use App\Domain\Analytics\PriceMetric;
use App\Domain\Analytics\StatisticalSummary;
use App\Domain\Analytics\SupplyDimension;
use App\Repositories\Analytics\AuctionAnalyticsRepository;
use App\Repositories\Analytics\AuctionStockQuery;
use App\Repositories\Analytics\MarketPriceRepository;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

/**
 * Cruza o inventário de leilões com os preços do mercado coletado para apontar
 * onde o lance mínimo está abaixo do que a região costuma pedir.
 */
class AuctionAnalyticsService
{
    private const MODALITIES = [
        'judicial' => 'Judicial',
        'extrajudicial' => 'Extrajudicial',
        'administrative' => 'Administrativo',
        'direct_sale' => 'Venda direta',
        'unknown' => 'Não informado',
    ];

    public function __construct(
        private readonly AuctionAnalyticsRepository $auctions,
        private readonly MarketPriceRepository $prices,
        private readonly AuctionStockQuery $lots,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function handle(MarketAnalyticsFilters $filters, int $limit): array
    {
        $medians = $this->marketMedians($filters);
        $summary = $this->auctions->summary($filters, $medians);
        $total = (int) $summary->total;
        $compared = (int) $summary->compared_to_market;
        $belowMarket = (int) $summary->below_market;

        return [
            'total_lots' => ['indicator' => 'A4.01', 'value' => $total],
            'with_appraisal' => ['indicator' => 'A4.02', 'value' => (int) $summary->with_appraisal],
            'median_minimum_bid' => ['indicator' => 'A4.03', 'value' => $this->decimal($summary->median_minimum_bid)],
            'median_appraisal' => ['indicator' => 'A4.04', 'value' => $this->decimal($summary->median_appraisal)],
            'median_discount' => ['indicator' => 'A4.05', 'value' => $this->share($summary->median_discount)],
            'median_minimum_bid_per_square_metre' => [
                'indicator' => 'A4.06',
                'value' => $this->decimal($summary->median_bid_per_square_metre),
            ],
            'compared_to_market' => ['indicator' => 'A4.07', 'value' => $compared],
            'below_market' => ['indicator' => 'A4.08', 'value' => $belowMarket],
            'below_market_share' => [
                'indicator' => 'A4.09',
                'value' => $compared === 0 ? null : round($belowMarket / $compared, 4),
            ],
            'median_market_gap' => ['indicator' => 'A4.10', 'value' => $this->share($summary->median_market_gap)],
            'by_modality' => [
                'indicator' => 'A4.11',
                'items' => $this->items($this->auctions->byModality($filters, $medians), $this->modality(...)),
            ],
            'by_type' => [
                'indicator' => 'A4.12',
                'items' => $this->items($this->auctions->byType($filters, $medians), AuctionPropertyType::label(...)),
            ],
            'by_neighbourhood' => [
                'indicator' => 'A4.13',
                'items' => $this->items($this->auctions->byNeighbourhood($filters, $medians)->take($limit)),
            ],
            'opportunities' => [
                'indicator' => 'A4.14',
                'items' => $this->opportunities($filters, $medians, $limit),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function meta(MarketAnalyticsFilters $filters): array
    {
        return [
            'generated_at' => CarbonImmutable::now(MarketAnalyticsFilters::TIMEZONE)->toIso8601String(),
            'data_reference_date' => $this->lots->latestObservedAt($filters)?->toIso8601String(),
        ];
    }

    /**
     * Mediana de R$/m² anunciada em cada bairro, descartando os bairros cuja
     * amostra é pequena demais para servir de referência.
     *
     * @return array<string, float>
     */
    private function marketMedians(MarketAnalyticsFilters $filters): array
    {
        return $this->prices
            ->summarizeBy($filters, PriceMetric::PricePerSquareMetre, SupplyDimension::Neighbourhood)
            ->reject(fn (StatisticalSummary $summary): bool => $summary->median === null)
            ->map(fn (StatisticalSummary $summary): float => (float) $summary->median)
            ->all();
    }

    /**
     * @param  array<string, float>  $medians
     * @return list<array<string, mixed>>
     */
    private function opportunities(MarketAnalyticsFilters $filters, array $medians, int $limit): array
    {
        return $this->auctions->opportunities($filters, $medians, $limit)
            ->map(fn (object $row): array => [
                'id' => (int) $row->id,
                'title' => (string) $row->title,
                'type' => AuctionPropertyType::label($row->property_type),
                'city' => $row->city,
                'neighbourhood' => $row->neighbourhood,
                'modality' => $this->modality((string) $row->sale_modality),
                'status' => (string) $row->status,
                'starts_at' => $row->starts_at === null
                    ? null
                    : CarbonImmutable::parse($row->starts_at)->setTimezone(MarketAnalyticsFilters::TIMEZONE)->toIso8601String(),
                'area' => $this->decimal($row->area),
                'minimum_bid' => $this->decimal($row->minimum_bid),
                'appraisal_value' => $this->decimal($row->appraisal_value),
                'discount' => $this->share($row->discount),
                'market_estimate' => $this->decimal($row->market_estimate),
                'market_gap' => $this->share($row->market_gap),
                'url' => $row->url,
            ])
            ->values()
            ->all();
    }

    /**
     * @param  Collection<int, object>  $rows
     * @return list<array<string, mixed>>
     */
    private function items(Collection $rows, ?callable $label = null): array
    {
        return $rows
            ->map(fn (object $row): array => [
                'label' => $label === null ? (string) $row->label : $label((string) $row->label),
                'count' => (int) $row->count,
                'below_market' => (int) $row->below_market,
                'median_minimum_bid' => $this->decimal($row->median_minimum_bid),
                'median_discount' => $this->share($row->median_discount),
            ])
            ->values()
            ->all();
    }

    private function modality(string $modality): string
    {
        return self::MODALITIES[$modality] ?? self::MODALITIES['unknown'];
    }

    private function decimal(mixed $value): ?float
    {
        return $value === null ? null : round((float) $value, 2);
    }

    private function share(mixed $value): ?float
    {
        return $value === null ? null : round((float) $value, 4);
    }
}
