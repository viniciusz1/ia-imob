<?php

namespace App\Services\Analytics;

use App\Domain\Analytics\MarketAnalyticsFilters;
use App\Domain\Valuation\ResidentialType;
use App\Repositories\Analytics\ValuationAnalyticsRepository;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

class ValuationAnalyticsService
{
    public function __construct(private readonly ValuationAnalyticsRepository $valuations) {}

    /**
     * @return array<string, mixed>
     */
    public function handle(MarketAnalyticsFilters $filters, int $limit): array
    {
        $summary = $this->valuations->summary($filters);
        $total = (int) $summary->total;
        $calculated = (int) $summary->calculated;

        return [
            'total' => ['indicator' => 'A3.01', 'value' => $total],
            'calculated' => ['indicator' => 'A3.02', 'value' => $calculated],
            'insufficient_sample' => ['indicator' => 'A3.03', 'value' => $total - $calculated],
            'calculated_share' => [
                'indicator' => 'A3.04',
                'value' => $total === 0 ? null : round($calculated / $total, 4),
            ],
            'median_value' => ['indicator' => 'A3.05', 'value' => $this->decimal($summary->median_value)],
            'average_value' => ['indicator' => 'A3.06', 'value' => $this->decimal($summary->average_value)],
            'median_price_per_square_metre' => [
                'indicator' => 'A3.07',
                'value' => $this->decimal($summary->median_per_square_metre),
            ],
            'by_type' => [
                'indicator' => 'A3.08',
                'items' => $this->items($this->valuations->byType($filters), ResidentialType::label(...)),
            ],
            'by_neighbourhood' => [
                'indicator' => 'A3.09',
                'items' => $this->items($this->valuations->byNeighbourhood($filters)->take($limit)),
            ],
            'by_month' => [
                'indicator' => 'A3.10',
                'items' => $this->valuations->byMonth($filters)
                    ->map(fn (object $row): array => ['label' => $row->label, 'count' => (int) $row->count])
                    ->all(),
            ],
            'by_user' => [
                'indicator' => 'A3.11',
                'items' => $this->items($this->valuations->byUser($filters)->take($limit)),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function meta(MarketAnalyticsFilters $filters): array
    {
        $latest = $this->valuations->latestCreatedAt($filters);

        return [
            'generated_at' => CarbonImmutable::now(MarketAnalyticsFilters::TIMEZONE)->toIso8601String(),
            'data_reference_date' => $latest === null
                ? null
                : CarbonImmutable::parse($latest, 'UTC')->setTimezone(MarketAnalyticsFilters::TIMEZONE)->toIso8601String(),
        ];
    }

    /**
     * @return list<array{label: string, count: int, median_value: float|null}>
     */
    private function items(Collection $rows, ?callable $label = null): array
    {
        return $rows
            ->map(fn (object $row): array => [
                'label' => $label === null ? (string) $row->label : $label((string) $row->label),
                'count' => (int) $row->count,
                'median_value' => $this->decimal($row->median_value),
            ])
            ->values()
            ->all();
    }

    private function decimal(mixed $value): ?float
    {
        return $value === null ? null : round((float) $value, 2);
    }
}
