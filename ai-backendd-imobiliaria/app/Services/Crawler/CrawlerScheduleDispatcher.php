<?php

namespace App\Services\Crawler;

use App\Models\Crawler\CrawlAgency;
use App\Models\Crawler\CrawlAgencyCircuit;
use App\Models\Crawler\CrawlAgencySchedule;
use App\Models\Crawler\ScheduleDefault;
use App\Models\User;

class CrawlerScheduleDispatcher
{
    public function __construct(
        private readonly CrawlerScheduleService $schedules,
        private readonly ProductionCrawlService $production,
    ) {}

    public function dispatchDue(): int
    {
        $default = ScheduleDefault::query()->findOrFail(1);
        $fallbackUser = User::query()->where('email', 'platform@imobiliaria.com')->first()
            ?? User::query()->firstOrFail();
        CrawlAgency::query()->where('lifecycle_state', 'active')->where('revalidation_required', false)
            ->each(function (CrawlAgency $agency) use ($default, $fallbackUser): void {
                CrawlAgencySchedule::query()->firstOrCreate(
                    ['crawl_agency_id' => $agency->id],
                    [
                        'inherit_default' => true,
                        'next_run_at' => $this->schedules->nextRunAt($default->preset, $default->timezone),
                        'created_by' => $default->updated_by ?? $fallbackUser->id,
                        'updated_by' => $default->updated_by ?? $fallbackUser->id,
                    ],
                );
            });

        $dispatched = 0;
        CrawlAgencySchedule::query()->whereNotNull('next_run_at')->where('next_run_at', '<=', now())
            ->orderBy('id')->each(function (CrawlAgencySchedule $schedule) use (&$dispatched, $default): void {
                $agency = CrawlAgency::query()->findOrFail($schedule->crawl_agency_id);
                $circuitOpen = CrawlAgencyCircuit::query()->where('crawl_agency_id', $agency->id)->where('state', 'open')->exists();
                if ($agency->lifecycle_state !== 'active' || $agency->revalidation_required || $circuitOpen) {
                    return;
                }
                $preset = $schedule->inherit_default ? $default->preset : $schedule->preset;
                $timezone = $schedule->inherit_default ? $default->timezone : $schedule->timezone;
                if ($preset === null || $timezone === null || $preset === 'manual') {
                    $schedule->update(['next_run_at' => null]);

                    return;
                }
                $user = User::query()->findOrFail($schedule->updated_by);
                $this->production->queue([
                    'crawl_agency_id' => $agency->id,
                    'discovery_mode' => 'fresh',
                    'trigger' => 'scheduled',
                ], $user);
                $schedule->update([
                    'last_enqueued_at' => now(),
                    'next_run_at' => $this->schedules->nextRunAt($preset, $timezone),
                ]);
                $dispatched++;
            });

        return $dispatched;
    }
}
