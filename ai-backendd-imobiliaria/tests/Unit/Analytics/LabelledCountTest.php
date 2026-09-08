<?php

namespace Tests\Unit\Analytics;

use App\Domain\Analytics\LabelledCount;
use PHPUnit\Framework\TestCase;

class LabelledCountTest extends TestCase
{
    public function test_share_is_relative_to_the_given_total(): void
    {
        $this->assertSame([
            'label' => 'Jaraguá do Sul',
            'count' => 3398,
            'share' => 0.8322,
        ], (new LabelledCount('Jaraguá do Sul', 3398))->toArray(4083));
    }

    public function test_an_empty_total_yields_no_share(): void
    {
        $this->assertSame(0.0, (new LabelledCount('Centro', 0))->toArray(0)['share']);
    }

    public function test_a_keyed_count_keeps_its_key_first(): void
    {
        $item = (new LabelledCount('Até R$ 200 mil', 873, 'ate-200k'))->toArray(4083);

        $this->assertSame(['key', 'label', 'count', 'share'], array_keys($item));
    }
}
