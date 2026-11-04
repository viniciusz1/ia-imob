<?php

namespace Tests\Unit\Analytics;

use App\Domain\Analytics\StatisticalSummary;
use PHPUnit\Framework\TestCase;

class StatisticalSummaryTest extends TestCase
{
    public function test_a_sample_at_the_minimum_keeps_its_statistics(): void
    {
        $summary = StatisticalSummary::of(5, 1, 300000.0, 320000.0, 200000.0, 400000.0);

        $this->assertFalse($summary->isInsufficient());
        $this->assertSame(300000.0, $summary->median);
        $this->assertSame(1, $summary->outliersDiscarded);
    }

    public function test_a_sample_below_the_minimum_drops_its_statistics(): void
    {
        $summary = StatisticalSummary::of(4, 0, 300000.0, 320000.0, 200000.0, 400000.0);

        $this->assertTrue($summary->isInsufficient());
        $this->assertNull($summary->median);
        $this->assertNull($summary->average);
        $this->assertSame(4, $summary->sampleSize);
    }

    public function test_an_empty_sample_reports_nothing(): void
    {
        $summary = StatisticalSummary::empty();

        $this->assertTrue($summary->isInsufficient());
        $this->assertSame(0, $summary->sampleSize);
        $this->assertNull($summary->thirdQuartile);
    }

    public function test_the_array_form_carries_the_sample_context(): void
    {
        $this->assertSame([
            'sample_size' => 4,
            'insufficient_sample' => true,
            'outliers_discarded' => 2,
            'median' => null,
            'average' => null,
            'p25' => null,
            'p75' => null,
        ], StatisticalSummary::of(4, 2, 1.0, 1.0, 1.0, 1.0)->toArray());
    }
}
