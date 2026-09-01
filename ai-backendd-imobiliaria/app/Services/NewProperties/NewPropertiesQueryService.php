<?php

namespace App\Services\NewProperties;

use App\Domain\Valuation\TextNormalizer;
use App\Models\CrawlerRun;
use App\Models\MarketProperty;
use App\Services\Crawler\PropertyTypeCatalog;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Collection;

class NewPropertiesQueryService
{
    private const MINIMUM_COMPARABLES = 5;

    private const OPPORTUNITY_THRESHOLD_PERCENT = 15.0;

    public function __construct(private readonly PublishedListingHistoryService $history) {}

    /**
     * @return array{groups: list<array<string, mixed>>, meta: array<string, mixed>}
     */
    public function get(): array
    {
        $currentRuns = $this->currentPublishedRuns();

        if ($currentRuns->isEmpty()) {
            return [
                'groups' => [],
                'meta' => [
                    'updated_at' => null,
                    'total' => 0,
                    'total_groups' => 0,
                    'total_new' => 0,
                    'total_opportunities' => 0,
                ],
            ];
        }

        $histories = $this->history->forCurrentRuns($currentRuns);
        $properties = $this->currentObservedProperties($currentRuns->pluck('id')->all());
        $propertiesByRun = $properties->groupBy('crawler_run_id');
        $comparableCutoff = $currentRuns->max(
            fn (CrawlerRun $run): string => $run->published_at->toISOString(),
        );
        $comparableIndex = $this->buildComparableIndex($properties);
        $groups = [];

        foreach ($currentRuns as $run) {
            $runProperties = $propertiesByRun->get($run->id, collect());
            $history = $histories->get((int) $run->id);
            $historySummary = $history['summary'];
            $historyFirstSeen = $history['first_seen_by_identity'];
            $historyCount = $historySummary['snapshot_count'];

            $classified = [];

            foreach ($runProperties as $property) {
                $identityId = (int) $property->getAttribute('new_properties_listing_identity_id');
                $firstSeen = $historyFirstSeen[$identityId] ?? null;
                $isNew = $historyCount > 0 && $firstSeen === null;
                $newReason = match (true) {
                    $historyCount === 0 => 'insufficient_history',
                    $isNew => 'absent_in_30_day_window',
                    default => 'observed_in_window',
                };
                $opportunity = $this->classifyOpportunity(
                    $property,
                    $identityId,
                    $comparableIndex,
                    $comparableCutoff,
                );

                $classified[] = [
                    'property' => $property,
                    'title' => $this->title($property),
                    'purpose' => $this->purpose($property),
                    'is_new' => $isNew,
                    'new_reason' => $newReason,
                    'history_window_start' => $historySummary['window_start'],
                    'history_snapshot_count' => $historyCount,
                    'first_seen_in_current_window_at' => ($firstSeen ?? $run->published_at)->toISOString(),
                    ...$opportunity,
                ];
            }

            $newCount = collect($classified)->where('is_new', true)->count();
            $opportunityCount = collect($classified)->where('is_opportunity', true)->count();
            $groups[] = [
                'crawl_agency' => [
                    'id' => (int) $run->crawl_agency_id,
                    'name' => (string) $run->getAttribute('crawl_agency_name'),
                ],
                'snapshot' => [
                    'id' => (int) $run->id,
                    'published_at' => $run->published_at->toISOString(),
                ],
                'counts' => [
                    'total' => count($classified),
                    'new' => $newCount,
                    'opportunities' => $opportunityCount,
                ],
                'history' => $historySummary,
                'properties' => array_values(array_filter(
                    $classified,
                    fn (array $property): bool => $property['is_new'] || $property['is_opportunity'],
                )),
            ];
        }

        return [
            'groups' => $groups,
            'meta' => [
                'updated_at' => $comparableCutoff,
                'total' => collect($groups)->sum('counts.total'),
                'total_groups' => count($groups),
                'total_new' => collect($groups)->sum('counts.new'),
                'total_opportunities' => collect($groups)->sum('counts.opportunities'),
            ],
        ];
    }

    /**
     * @return EloquentCollection<int, CrawlerRun>
     */
    private function currentPublishedRuns(): EloquentCollection
    {
        return CrawlerRun::query()
            ->join('crawler.crawl_agencies as current_agency', function ($join): void {
                $join->on('current_agency.current_published_crawl_run_id', '=', 'crawler.crawl_runs.id')
                    ->on('current_agency.id', '=', 'crawler.crawl_runs.crawl_agency_id');
            })
            ->where('crawler.crawl_runs.publication_state', 'published')
            ->whereNotNull('crawler.crawl_runs.published_at')
            ->orderBy('current_agency.name')
            ->orderBy('crawler.crawl_runs.id')
            ->get([
                'crawler.crawl_runs.*',
                'current_agency.name as crawl_agency_name',
            ]);
    }

    /**
     * @param  list<int>  $runIds
     * @return EloquentCollection<int, MarketProperty>
     */
    private function currentObservedProperties(array $runIds): EloquentCollection
    {
        return MarketProperty::query()
            ->join('crawler.listing_versions as current_listing_version', function ($join): void {
                $join->on('current_listing_version.market_property_id', '=', 'crawler.market_properties.id')
                    ->on('current_listing_version.crawl_run_id', '=', 'crawler.market_properties.crawler_run_id');
            })
            ->whereIn('crawler.market_properties.crawler_run_id', $runIds)
            ->whereNotNull('current_listing_version.market_property_id')
            ->where('current_listing_version.classification', '!=', 'removed')
            ->with(['crawlerRun.crawlAgency'])
            ->orderBy('crawler.market_properties.crawler_run_id')
            ->orderBy('crawler.market_properties.id')
            ->get([
                'crawler.market_properties.*',
                'current_listing_version.listing_identity_id as new_properties_listing_identity_id',
            ]);
    }

    /**
     * @param  EloquentCollection<int, MarketProperty>  $properties
     * @return array<string, list<array{property: MarketProperty, identity_id: int, price_per_square_meter: float}>>
     */
    private function buildComparableIndex(EloquentCollection $properties): array
    {
        $index = [];

        foreach ($properties as $property) {
            $segment = $this->segment($property);
            $price = (float) $property->valor;
            $area = (float) $property->area;

            if ($segment === null || $price <= 0 || $area <= 0) {
                continue;
            }

            $index[$segment][] = [
                'property' => $property,
                'identity_id' => (int) $property->getAttribute('new_properties_listing_identity_id'),
                'price_per_square_meter' => $price / $area,
            ];
        }

        return $index;
    }

    /**
     * @param  array<string, list<array{property: MarketProperty, identity_id: int, price_per_square_meter: float}>>  $index
     * @return array<string, mixed>
     */
    private function classifyOpportunity(
        MarketProperty $candidate,
        int $identityId,
        array $index,
        string $comparableCutoff,
    ): array {
        $price = (float) $candidate->valor;
        $area = (float) $candidate->area;
        $pricePerSquareMeter = $price > 0 && $area > 0 ? $price / $area : null;
        $base = [
            'is_opportunity' => false,
            'opportunity_score' => null,
            'opportunity_reason' => 'missing_price_or_area',
            'opportunity_explanation' => 'Preço ou área indisponível para calcular o custo-benefício.',
            'price_per_square_meter' => $pricePerSquareMeter === null ? null : round($pricePerSquareMeter, 2),
            'benchmark_price_per_square_meter' => null,
            'price_advantage_percentage' => null,
            'comparable_count' => 0,
            'sample_size_indicator' => null,
            'candidate_snapshot_id' => (int) $candidate->crawler_run_id,
            'comparable_snapshot_ids' => [],
            'comparable_cutoff_at' => $comparableCutoff,
        ];

        if ($pricePerSquareMeter === null) {
            return $base;
        }

        $segment = $this->segment($candidate);
        if ($segment === null) {
            return [
                ...$base,
                'opportunity_reason' => 'invalid_comparable_segment',
                'opportunity_explanation' => 'Finalidade, cidade, bairro ou tipo insuficiente para formar a comparação.',
            ];
        }

        $comparables = collect($index[$segment] ?? [])
            ->filter(function (array $comparable) use ($candidate, $identityId, $area): bool {
                $property = $comparable['property'];

                if ($comparable['identity_id'] === $identityId) {
                    return false;
                }

                $comparableArea = (float) $property->area;
                if ($comparableArea < $area * 0.75 || $comparableArea > $area * 1.25) {
                    return false;
                }

                return $candidate->quartos === null
                    || $property->quartos === null
                    || (int) $candidate->quartos === (int) $property->quartos;
            })
            ->values();
        $comparableCount = $comparables->count();
        $snapshotIds = $comparables
            ->pluck('property.crawler_run_id')
            ->map(fn ($id): int => (int) $id)
            ->unique()
            ->sort()
            ->values()
            ->all();

        if ($comparableCount < self::MINIMUM_COMPARABLES) {
            return [
                ...$base,
                'opportunity_reason' => 'insufficient_comparables',
                'opportunity_explanation' => "Somente {$comparableCount} imóveis comparáveis; são necessários pelo menos 5.",
                'comparable_count' => $comparableCount,
                'comparable_snapshot_ids' => $snapshotIds,
            ];
        }

        $benchmark = $this->median($comparables->pluck('price_per_square_meter'));
        $advantage = (($benchmark - $pricePerSquareMeter) / $benchmark) * 100;
        $isOpportunity = $advantage >= self::OPPORTUNITY_THRESHOLD_PERCENT;
        $score = $isOpportunity
            ? max(0, min(100, (int) round($advantage * 4)))
            : null;
        $reason = match (true) {
            $isOpportunity => 'price_below_comparable_median',
            $advantage <= 0 => 'at_or_above_comparable_median',
            default => 'below_opportunity_threshold',
        };
        $explanation = $isOpportunity
            ? sprintf(
                '%.1f%% abaixo da mediana de %d imóveis comparáveis.',
                $advantage,
                $comparableCount,
            )
            : sprintf(
                'Diferença de %.1f%% em relação à mediana de %d imóveis comparáveis.',
                $advantage,
                $comparableCount,
            );

        return [
            ...$base,
            'is_opportunity' => $isOpportunity,
            'opportunity_score' => $score,
            'opportunity_reason' => $reason,
            'opportunity_explanation' => $explanation,
            'benchmark_price_per_square_meter' => round($benchmark, 2),
            'price_advantage_percentage' => round($advantage, 2),
            'comparable_count' => $comparableCount,
            'sample_size_indicator' => match (true) {
                $comparableCount >= 15 => 'high',
                $comparableCount >= 8 => 'medium',
                default => 'low',
            },
            'comparable_snapshot_ids' => $snapshotIds,
        ];
    }

    private function segment(MarketProperty $property): ?string
    {
        $parts = [
            $this->purpose($property),
            $this->normalize((string) $property->cidade),
            $this->normalize((string) $property->bairro),
            $this->normalize(PropertyTypeCatalog::canonicalNameFor($property->tipo) ?? (string) $property->tipo),
        ];

        if (in_array(null, $parts, true)) {
            return null;
        }

        return implode('|', $parts);
    }

    private function purpose(MarketProperty $property): ?string
    {
        $payload = $property->payload;
        $explicit = collect([
            $payload['purpose'] ?? null,
            $payload['finalidade'] ?? null,
            $payload['transaction_type'] ?? null,
            $payload['tipo_negocio'] ?? null,
            $payload['negocio'] ?? null,
        ])->first(fn ($value): bool => is_string($value) && trim($value) !== '');

        if (is_string($explicit)) {
            $resolved = $this->purposeFromText($explicit);
            if ($resolved !== null) {
                return $resolved;
            }
        }

        return $this->purposeFromText(implode(' ', array_filter([
            $property->link_imovel,
            is_string($payload['url'] ?? null) ? $payload['url'] : null,
        ])));
    }

    private function purposeFromText(string $value): ?string
    {
        $normalized = $this->normalize($value);
        if ($normalized === null) {
            return null;
        }

        $isSale = preg_match('/\b(venda|vender|comprar|compra)\b/', $normalized) === 1;
        $isRent = preg_match('/\b(locacao|aluguel|alugar)\b/', $normalized) === 1;

        return match (true) {
            $isSale && ! $isRent => 'venda',
            $isRent && ! $isSale => 'locacao',
            default => null,
        };
    }

    private function normalize(string $value): ?string
    {
        $normalized = TextNormalizer::normalize($value);

        return $normalized === '' ? null : $normalized;
    }

    private function title(MarketProperty $property): string
    {
        $payloadTitle = $property->payload['titulo'] ?? $property->payload['title'] ?? null;
        if (is_string($payloadTitle) && trim($payloadTitle) !== '') {
            return trim($payloadTitle);
        }

        $type = PropertyTypeCatalog::canonicalNameFor($property->tipo)
            ?? (trim((string) $property->tipo) ?: 'Imóvel');
        $location = trim((string) ($property->bairro ?: $property->cidade));

        return $location === '' ? $type : "{$type} em {$location}";
    }

    /**
     * @param  Collection<int, float|int>  $values
     */
    private function median(Collection $values): float
    {
        $sorted = $values->map(fn ($value): float => (float) $value)->sort()->values();
        $count = $sorted->count();
        $middle = intdiv($count, 2);

        if ($count % 2 === 1) {
            return $sorted[$middle];
        }

        return ($sorted[$middle - 1] + $sorted[$middle]) / 2;
    }
}
