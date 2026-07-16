<?php

namespace App\Services\Crawler;

use App\Models\Crawler\CrawlAgency;
use App\Models\Crawler\CrawlAgencyCircuit;
use App\Models\Crawler\CrawlAgencySchedule;
use App\Models\Crawler\ScheduleDefault;
use App\Models\User;
use Carbon\CarbonImmutable;

class CrawlerScheduleService
{
    public function updateDefault(string $preset, string $timezone, User $user): ScheduleDefault
    {
        $default = ScheduleDefault::query()->findOrFail(1);
        $default->update(['preset' => $preset, 'timezone' => $timezone, 'updated_by' => $user->id]);
        CrawlAgencySchedule::query()->where('inherit_default', true)->each(function (CrawlAgencySchedule $schedule) use ($preset, $timezone): void {
            $schedule->update(['next_run_at' => $this->nextRunAt($preset, $timezone)]);
        });

        return $default->refresh();
    }

    public function updateAgency(CrawlAgency $agency, array $input, User $user): CrawlAgencySchedule
    {
        $inherit = (bool) $input['inherit_default'];
        $default = ScheduleDefault::query()->findOrFail(1);
        $preset = $inherit ? $default->preset : $input['preset'];
        $timezone = $inherit ? $default->timezone : $input['timezone'];
        $schedule = CrawlAgencySchedule::query()->updateOrCreate(
            ['crawl_agency_id' => $agency->id],
            [
                'inherit_default' => $inherit,
                'preset' => $inherit ? null : $preset,
                'timezone' => $inherit ? null : $timezone,
                'next_run_at' => $this->nextRunAt($preset, $timezone),
                'created_by' => CrawlAgencySchedule::query()->where('crawl_agency_id', $agency->id)->value('created_by') ?? $user->id,
                'updated_by' => $user->id,
            ],
        );

        return $schedule->refresh();
    }

    public function representation(CrawlAgency $agency, ?CrawlAgencySchedule $schedule = null): array
    {
        $default = ScheduleDefault::query()->findOrFail(1);
        $schedule ??= CrawlAgencySchedule::query()->where('crawl_agency_id', $agency->id)->first();
        $inherit = $schedule?->inherit_default ?? true;
        $circuit = CrawlAgencyCircuit::query()->where('crawl_agency_id', $agency->id)->first();

        return [
            'id' => $schedule?->id,
            'crawl_agency_id' => $agency->id,
            'inherit_default' => $inherit,
            'preset' => $schedule?->preset,
            'timezone' => $schedule?->timezone,
            'effective_preset' => $inherit ? $default->preset : $schedule?->preset,
            'effective_timezone' => $inherit ? $default->timezone : $schedule?->timezone,
            'next_run_at' => $schedule?->next_run_at,
            'last_enqueued_at' => $schedule?->last_enqueued_at,
            'suspended' => $circuit?->state === 'open',
            'suspension_reason' => $circuit?->reason,
            'circuit' => [
                'state' => $circuit?->state ?? 'closed',
                'consecutive_failures' => $circuit?->consecutive_failures ?? 0,
            ],
        ];
    }

    public function nextRunAt(string $preset, string $timezone, ?CarbonImmutable $now = null): ?CarbonImmutable
    {
        if ($preset === 'manual') {
            return null;
        }
        $localNow = ($now ?? CarbonImmutable::now('UTC'))->setTimezone($timezone);
        $allowedDays = match ($preset) {
            'daily' => range(1, 7),
            'twice_weekly' => [1, 4],
            'weekly' => [1],
        };
        for ($offset = 0; $offset <= 7; $offset++) {
            $candidate = $localNow->startOfDay()->addDays($offset)->setTime(3, 0);
            if (in_array($candidate->dayOfWeekIso, $allowedDays, true) && $candidate->isAfter($localNow)) {
                return $candidate->utc();
            }
        }

        throw new \LogicException('Unable to calculate the next crawler schedule.');
    }
}
