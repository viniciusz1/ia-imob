<?php

namespace App\Services\Crawler;

use App\Enums\Crawler\CrawlAgencyLifecycle;
use App\Models\Crawler\CrawlAgency;
use App\Models\Crawler\ExtractionProfile;
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

        if ($target === CrawlAgencyLifecycle::Active) {
            $hasActiveProfile = ExtractionProfile::query()
                ->where('crawl_agency_id', $crawlAgency->id)
                ->where('status', 'active')
                ->exists();

            if (! $hasActiveProfile || $crawlAgency->revalidation_required) {
                throw ValidationException::withMessages([
                    'lifecycle_state' => 'An active, validated Extraction Profile is required.',
                ]);
            }
        }

        $crawlAgency->update(['lifecycle_state' => $target->value]);

        return $crawlAgency->refresh();
    }
}
