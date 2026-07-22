<?php

namespace App\Services\Crawler;

class DistributedSnapshotSampler
{
    public function sample(array $urls, int $limit = 20): array
    {
        $urls = array_values($urls);
        $count = count($urls);

        if ($count <= $limit) {
            return $urls;
        }

        return array_map(
            fn (int $position): string => $urls[(int) round($position * ($count - 1) / ($limit - 1))],
            range(0, $limit - 1),
        );
    }
}
