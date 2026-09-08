<?php

namespace App\Domain\Analytics;

final class LabelledCount
{
    public function __construct(
        public readonly string $label,
        public readonly int $count,
        public readonly ?string $key = null,
    ) {}

    /**
     * @return array{key?: string, label: string, count: int, share: float}
     */
    public function toArray(int $total): array
    {
        $item = [
            'label' => $this->label,
            'count' => $this->count,
            'share' => $total === 0 ? 0.0 : round($this->count / $total, 4),
        ];

        return $this->key === null ? $item : ['key' => $this->key, ...$item];
    }
}
