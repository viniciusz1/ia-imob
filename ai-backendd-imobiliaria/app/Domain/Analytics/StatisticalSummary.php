<?php

namespace App\Domain\Analytics;

final class StatisticalSummary
{
    public const MINIMUM_SAMPLE = 5;

    private function __construct(
        public readonly int $sampleSize,
        public readonly int $outliersDiscarded,
        public readonly ?float $median,
        public readonly ?float $average,
        public readonly ?float $firstQuartile,
        public readonly ?float $thirdQuartile,
    ) {}

    public static function empty(): self
    {
        return new self(0, 0, null, null, null, null);
    }

    public static function of(
        int $sampleSize,
        int $outliersDiscarded,
        ?float $median,
        ?float $average,
        ?float $firstQuartile,
        ?float $thirdQuartile,
    ): self {
        if ($sampleSize < self::MINIMUM_SAMPLE) {
            return new self($sampleSize, $outliersDiscarded, null, null, null, null);
        }

        return new self($sampleSize, $outliersDiscarded, $median, $average, $firstQuartile, $thirdQuartile);
    }

    public function isInsufficient(): bool
    {
        return $this->sampleSize < self::MINIMUM_SAMPLE;
    }

    /**
     * @return array{sample_size: int, insufficient_sample: bool, outliers_discarded: int, median: float|null, average: float|null, p25: float|null, p75: float|null}
     */
    public function toArray(): array
    {
        return [
            'sample_size' => $this->sampleSize,
            'insufficient_sample' => $this->isInsufficient(),
            'outliers_discarded' => $this->outliersDiscarded,
            'median' => $this->median,
            'average' => $this->average,
            'p25' => $this->firstQuartile,
            'p75' => $this->thirdQuartile,
        ];
    }
}
