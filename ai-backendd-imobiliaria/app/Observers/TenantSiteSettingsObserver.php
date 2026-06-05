<?php

namespace App\Observers;

use App\Models\TenantSiteSettings;
use App\Services\RevalidationService;

class TenantSiteSettingsObserver
{
    public function __construct(
        private RevalidationService $revalidation,
    ) {}

    public function saved(TenantSiteSettings $settings): void
    {
        $tags = [];
        $domains = $settings->tenant?->domains;

        if ($domains) {
            foreach ($domains as $domain) {
                $tags[] = "tenant:{$domain->hostname}";
            }
        }

        if (!empty($tags)) {
            $this->revalidation->revalidate(array_unique($tags));
        }
    }
}
