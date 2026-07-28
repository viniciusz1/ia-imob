<?php

namespace App\Support\Crawler;

final class OnboardingStrategyCatalog
{
    public const EXTRACTION_STRATEGIES = [
        'xpath',
        'css',
        'fit_markdown_regex',
        'fit_markdown_llm',
        'llm_full_html',
    ];

    public static function isCanonicalExtractionOrder(array $strategies): bool
    {
        return array_values($strategies) === array_values(array_filter(
            self::EXTRACTION_STRATEGIES,
            fn (string $strategy): bool => in_array($strategy, $strategies, true),
        ));
    }
}
