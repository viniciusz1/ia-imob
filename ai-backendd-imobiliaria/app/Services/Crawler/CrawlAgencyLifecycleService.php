<?php

namespace App\Services\Crawler;

use App\Enums\Crawler\CrawlAgencyLifecycle;
use App\Models\Crawler\CrawlAgency;
use Illuminate\Validation\ValidationException;

class CrawlAgencyLifecycleService
{
    public function transition(CrawlAgency $crawlAgency, CrawlAgencyLifecycle $target): CrawlAgency
    {
        $current = CrawlAgencyLifecycle::from($crawlAgency->lifecycle_state);

        if (! in_array($target, $current->allowedTransitions(), true)) {
            throw ValidationException::withMessages([
                'lifecycle_state' => "Transition from {$current->value} to {$target->value} is not allowed.",
            ]);
        }

        $crawlAgency->update(['lifecycle_state' => $target->value]);

        return $crawlAgency->refresh();
    }
}
