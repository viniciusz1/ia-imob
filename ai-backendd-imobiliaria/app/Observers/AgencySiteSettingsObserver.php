<?php

namespace App\Observers;

use App\Models\AgencySiteSettings;
use App\Services\RevalidationService;

class AgencySiteSettingsObserver
{
    public function __construct(
        private RevalidationService $revalidation,
    ) {}

    public function saved(AgencySiteSettings $settings): void
    {
        $tags = [];
        $domains = $settings->agency?->domains;

        if ($domains) {
            foreach ($domains as $domain) {
                $tags[] = "agency:{$domain->hostname}";
            }
        }

        if (! empty($tags)) {
            $this->revalidation->revalidate(array_unique($tags));
        }
    }
}
