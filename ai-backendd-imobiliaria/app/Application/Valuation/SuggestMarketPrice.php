<?php

namespace App\Application\Valuation;

use App\Domain\Valuation\MarketValuationCalculator;
use App\Domain\Valuation\ValuationInput;

final readonly class SuggestMarketPrice
{
    public function __construct(private MarketValuationCalculator $calculator) {}

    public function execute(ValuationInput $input): array
    {
        $result = $this->calculator->calculate($input);

        return [
            'status' => $result->status,
            'purpose' => $input->purpose,
            'range' => $result->finalRange === null ? null : array_map(
                static fn (float $value): float => round($value, 2),
                $result->finalRange,
            ),
            'flood_adjustment_percent' => $result->floodAdjustmentPercent,
            'sample_summary' => $result->sampleSummary,
        ];
    }
}
