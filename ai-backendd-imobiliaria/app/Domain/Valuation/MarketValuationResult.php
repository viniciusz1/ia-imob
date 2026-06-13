<?php

namespace App\Domain\Valuation;

final readonly class MarketValuationResult
{
    public function __construct(
        public string $status,
        public ?array $baseRange,
        public ?array $finalRange,
        public ?int $floodAdjustmentPercent,
        public array $sampleSummary,
        public array $comparableEvidence,
    ) {}
}
