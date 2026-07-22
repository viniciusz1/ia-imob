<?php

namespace Tests\Unit\Crawler;

use App\Services\Crawler\MarketDataContractCompatibility;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class MarketDataContractCompatibilityTest extends TestCase
{
    #[DataProvider('changes')]
    public function test_it_classifies_contract_changes(array $current, array $candidate, string $expected): void
    {
        $compatibility = new MarketDataContractCompatibility;

        $this->assertSame($expected, $compatibility->classify($current, $candidate));
    }

    public static function changes(): array
    {
        $base = [
            ['name' => 'title', 'type' => 'string', 'required' => true],
            ['name' => 'price', 'type' => 'decimal', 'required' => true],
        ];

        return [
            'optional field is additive' => [
                $base,
                [...$base, ['name' => 'condominium_fee', 'type' => 'decimal', 'required' => false]],
                'additive_optional',
            ],
            'new required field is incompatible' => [
                $base,
                [...$base, ['name' => 'city', 'type' => 'string', 'required' => true]],
                'incompatible',
            ],
            'type change is incompatible' => [
                $base,
                [
                    ['name' => 'title', 'type' => 'string', 'required' => true],
                    ['name' => 'price', 'type' => 'integer', 'required' => true],
                ],
                'incompatible',
            ],
        ];
    }
}
