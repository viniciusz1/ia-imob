<?php

namespace App\Services\NewProperties;

use App\Models\Crawler\ListingVersion;
use App\Models\CrawlerRun;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Collection;

class PublishedListingHistoryService
{
    public const WINDOW_DAYS = 30;

    /**
     * @param  EloquentCollection<int, CrawlerRun>  $currentRuns
     * @return Collection<int, array{
     *     summary: array{
     *         status: string,
     *         window_days: int,
     *         window_start: string,
     *         window_end: string,
     *         snapshot_count: int,
     *         snapshot_ids: list<int>,
     *         observed_identity_count: int,
     *         identity_strategy: string
     *     },
     *     first_seen_by_identity: array<int, CarbonImmutable>
     * }>
     */
    public function forCurrentRuns(EloquentCollection $currentRuns): Collection
    {
        if ($currentRuns->isEmpty()) {
            return collect();
        }

        $historyRuns = $this->historyRuns($currentRuns);
        $historyByAgency = $historyRuns->groupBy('crawl_agency_id');
        $observedIdentitiesByRun = $this->observedIdentitiesByRun($historyRuns);

        return $currentRuns->mapWithKeys(function (CrawlerRun $currentRun) use ($historyByAgency, $observedIdentitiesByRun): array {
            $windowEnd = CarbonImmutable::instance($currentRun->published_at);
            $windowStart = $windowEnd->subDays(self::WINDOW_DAYS);
            $agencyHistory = $historyByAgency
                ->get($currentRun->crawl_agency_id, collect())
                ->filter(fn (CrawlerRun $historyRun): bool => $historyRun->published_at->greaterThanOrEqualTo($windowStart)
                    && $historyRun->published_at->lessThan($windowEnd))
                ->values();
            $snapshotIds = $agencyHistory
                ->pluck('id')
                ->map(fn ($id): int => (int) $id)
                ->all();
            $firstSeenByIdentity = [];

            foreach ($agencyHistory as $historyRun) {
                foreach ($observedIdentitiesByRun[$historyRun->id] ?? [] as $identityId) {
                    $publishedAt = CarbonImmutable::instance($historyRun->published_at);
                    $known = $firstSeenByIdentity[$identityId] ?? null;

                    if ($known === null || $publishedAt->lessThan($known)) {
                        $firstSeenByIdentity[$identityId] = $publishedAt;
                    }
                }
            }

            return [
                (int) $currentRun->id => [
                    'summary' => [
                        'status' => $snapshotIds === [] ? 'insufficient' : 'sufficient',
                        'window_days' => self::WINDOW_DAYS,
                        'window_start' => $windowStart->toISOString(),
                        'window_end' => $windowEnd->toISOString(),
                        'snapshot_count' => count($snapshotIds),
                        'snapshot_ids' => $snapshotIds,
                        'observed_identity_count' => count($firstSeenByIdentity),
                        'identity_strategy' => 'listing_identity',
                    ],
                    'first_seen_by_identity' => $firstSeenByIdentity,
                ],
            ];
        });
    }

    /**
     * @param  EloquentCollection<int, CrawlerRun>  $currentRuns
     * @return EloquentCollection<int, CrawlerRun>
     */
    private function historyRuns(EloquentCollection $currentRuns): EloquentCollection
    {
        $earliestCutoff = $currentRuns
            ->map(fn (CrawlerRun $run): CarbonInterface => $run->published_at->copy()->subDays(self::WINDOW_DAYS))
            ->min();
        $latestPublication = $currentRuns->max('published_at');

        return CrawlerRun::query()
            ->whereIn('crawl_agency_id', $currentRuns->pluck('crawl_agency_id')->unique()->all())
            ->where('publication_state', 'published')
            ->whereNotNull('published_at')
            ->where('published_at', '>=', $earliestCutoff)
            ->where('published_at', '<=', $latestPublication)
            ->whereNotIn('id', $currentRuns->pluck('id')->all())
            ->orderBy('published_at')
            ->get(['id', 'crawl_agency_id', 'published_at']);
    }

    /**
     * @param  EloquentCollection<int, CrawlerRun>  $historyRuns
     * @return array<int, list<int>>
     */
    private function observedIdentitiesByRun(EloquentCollection $historyRuns): array
    {
        if ($historyRuns->isEmpty()) {
            return [];
        }

        return ListingVersion::query()
            ->whereIn('crawl_run_id', $historyRuns->pluck('id')->all())
            ->whereNotNull('market_property_id')
            ->where('classification', '!=', 'removed')
            ->get(['listing_identity_id', 'crawl_run_id'])
            ->groupBy('crawl_run_id')
            ->map(fn (EloquentCollection $versions): array => $versions
                ->pluck('listing_identity_id')
                ->map(fn ($id): int => (int) $id)
                ->unique()
                ->values()
                ->all())
            ->all();
    }
}
