<?php

namespace App\Observers;

use App\Models\Property;
use App\Services\RevalidationService;

class PropertyObserver
{
    public function __construct(
        private RevalidationService $revalidation,
    ) {}

    public function saved(Property $property): void
    {
        $tags = [];

        if ($property->slug) {
            $tags[] = "property:{$property->slug}";
        }

        // Revalidate listing pages for each agency domain
        $domains = $property->agency?->domains;
        if ($domains) {
            foreach ($domains as $domain) {
                $tags[] = "agency:{$domain->hostname}";
            }
        }

        if (! empty($tags)) {
            $this->revalidation->revalidate(array_unique($tags));
        }
    }

    public function deleted(Property $property): void
    {
        $this->saved($property);
    }
}
