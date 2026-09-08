<?php

namespace Tests\Unit\Analytics;

use App\Domain\Analytics\FixedRanges;
use PHPUnit\Framework\TestCase;

class FixedRangesTest extends TestCase
{
    public function test_price_boundary_belongs_to_the_upper_range(): void
    {
        $this->assertSame('ate-200k', FixedRanges::bucketOf(199999.99, FixedRanges::price()));
        $this->assertSame('200k-350k', FixedRanges::bucketOf(200000.0, FixedRanges::price()));
        $this->assertSame('acima-2m', FixedRanges::bucketOf(38000000.0, FixedRanges::price()));
    }

    public function test_area_boundary_belongs_to_the_upper_range(): void
    {
        $this->assertSame('ate-50', FixedRanges::bucketOf(49.9, FixedRanges::area()));
        $this->assertSame('50-80', FixedRanges::bucketOf(50.0, FixedRanges::area()));
        $this->assertSame('acima-350', FixedRanges::bucketOf(1200.0, FixedRanges::area()));
    }

    public function test_missing_value_has_no_bucket(): void
    {
        $this->assertNull(FixedRanges::bucketOf(null, FixedRanges::price()));
        $this->assertNull(FixedRanges::bucketOf(null, FixedRanges::area()));
    }

    public function test_bedroom_buckets_close_at_five_or_more(): void
    {
        $keys = array_column(FixedRanges::bedrooms(), 'key');

        $this->assertSame(['0', '1', '2', '3', '4', '5+'], $keys);
        $this->assertTrue(FixedRanges::bedrooms()[5]['open_ended']);
    }

    public function test_parking_buckets_close_at_three_or_more(): void
    {
        $keys = array_column(FixedRanges::parkingSpaces(), 'key');

        $this->assertSame(['0', '1', '2', '3+'], $keys);
        $this->assertTrue(FixedRanges::parkingSpaces()[3]['open_ended']);
    }
}
