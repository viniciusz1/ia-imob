<?php

namespace Tests\Unit\Crawler;

use App\Services\Crawler\DistributedSnapshotSampler;
use PHPUnit\Framework\TestCase;

class DistributedSnapshotSamplerTest extends TestCase
{
    public function test_it_uses_every_url_when_the_snapshot_has_at_most_twenty(): void
    {
        $urls = array_map(fn (int $index): string => "https://example.com/property/{$index}", range(1, 12));

        $this->assertSame($urls, (new DistributedSnapshotSampler)->sample($urls));
    }

    public function test_it_selects_twenty_urls_distributed_from_first_to_last(): void
    {
        $urls = array_map(fn (int $index): string => "https://example.com/property/{$index}", range(1, 100));

        $sample = (new DistributedSnapshotSampler)->sample($urls);

        $this->assertCount(20, $sample);
        $this->assertSame($urls[0], $sample[0]);
        $this->assertSame($urls[99], $sample[19]);
        $this->assertCount(20, array_unique($sample));
        $this->assertGreaterThan(40, array_search($sample[10], $urls, true));
    }
}
