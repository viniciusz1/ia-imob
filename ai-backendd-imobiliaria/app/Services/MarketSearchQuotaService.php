<?php

namespace App\Services;

use App\Exceptions\MarketSearchAllowanceExceeded;
use App\Models\Agency;
use App\Models\AgencyConfiguration;
use App\Models\AgencyMarketSearchUsage;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Closure;
use Illuminate\Support\Facades\DB;
use Throwable;

class MarketSearchQuotaService
{
    public const TIMEZONE = 'America/Sao_Paulo';

    /**
     * Reserve one Market Search, run it, and return the reservation if it fails.
     */
    public function execute(Agency $agency, Closure $search): mixed
    {
        $weekStartedOn = $this->reserve($agency);

        try {
            return $search();
        } catch (Throwable $exception) {
            $this->release($agency->id, $weekStartedOn);

            throw $exception;
        }
    }

    public function summary(Agency $agency): array
    {
        $period = $this->period();
        $used = (int) AgencyMarketSearchUsage::query()
            ->where('agency_id', $agency->id)
            ->whereDate('week_started_on', $period['week_started_on'])
            ->value('used_count');
        $limit = (int) ($agency->configuration?->market_search_weekly_limit
            ?? AgencyConfiguration::DEFAULT_MARKET_SEARCH_WEEKLY_LIMIT);

        return [
            'limit' => $limit,
            'used' => $used,
            'remaining' => max($limit - $used, 0),
            'week_started_on' => $period['week_started_on'],
            'resets_at' => $period['resets_at'],
        ];
    }

    private function reserve(Agency $agency): string
    {
        $period = $this->period();

        return DB::transaction(function () use ($agency, $period): string {
            $lockedAgency = Agency::query()->lockForUpdate()->findOrFail($agency->id);

            AgencyConfiguration::query()->insertOrIgnore([
                'agency_id' => $lockedAgency->id,
                'market_search_weekly_limit' => AgencyConfiguration::DEFAULT_MARKET_SEARCH_WEEKLY_LIMIT,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $configuration = AgencyConfiguration::query()
                ->where('agency_id', $lockedAgency->id)
                ->lockForUpdate()
                ->firstOrFail();

            AgencyMarketSearchUsage::query()->insertOrIgnore([
                'agency_id' => $lockedAgency->id,
                'week_started_on' => $period['week_started_on'],
                'used_count' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $usage = AgencyMarketSearchUsage::query()
                ->where('agency_id', $lockedAgency->id)
                ->whereDate('week_started_on', $period['week_started_on'])
                ->lockForUpdate()
                ->firstOrFail();
            $limit = (int) $configuration->market_search_weekly_limit;

            if ($limit === 0 || $usage->used_count >= $limit) {
                throw new MarketSearchAllowanceExceeded($this->summaryFromValues(
                    $limit,
                    (int) $usage->used_count,
                    $period,
                ));
            }

            $usage->increment('used_count');

            return $period['week_started_on'];
        }, 3);
    }

    private function release(int $agencyId, string $weekStartedOn): void
    {
        DB::transaction(function () use ($agencyId, $weekStartedOn): void {
            $usage = AgencyMarketSearchUsage::query()
                ->where('agency_id', $agencyId)
                ->whereDate('week_started_on', $weekStartedOn)
                ->lockForUpdate()
                ->first();

            if ($usage !== null && $usage->used_count > 0) {
                $usage->decrement('used_count');
            }
        }, 3);
    }

    private function period(): array
    {
        $start = CarbonImmutable::now(self::TIMEZONE)
            ->startOfWeek(CarbonInterface::MONDAY)
            ->startOfDay();

        return [
            'week_started_on' => $start->toDateString(),
            'resets_at' => $start->addWeek()->toIso8601String(),
        ];
    }

    private function summaryFromValues(int $limit, int $used, array $period): array
    {
        return [
            'limit' => $limit,
            'used' => $used,
            'remaining' => max($limit - $used, 0),
            'week_started_on' => $period['week_started_on'],
            'resets_at' => $period['resets_at'],
        ];
    }
}
