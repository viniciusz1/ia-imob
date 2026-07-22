<?php

namespace App\Enums\Crawler;

enum CrawlAgencyLifecycle: string
{
    case Onboarding = 'onboarding';
    case Active = 'active';
    case Paused = 'paused';
    case Archived = 'archived';

    /** @return list<self> */
    public function allowedTransitions(): array
    {
        return match ($this) {
            self::Onboarding => [self::Active],
            self::Active => [self::Paused, self::Archived],
            self::Paused => [self::Active, self::Archived],
            self::Archived => [],
        };
    }
}
