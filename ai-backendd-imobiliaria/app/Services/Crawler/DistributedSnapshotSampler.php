<?php

namespace App\Services\Crawler;

class DistributedSnapshotSampler
{
    public function sample(array $urls, int $limit = 20, ?string $referenceUrl = null): array
    {
        $urls = array_values($urls);
        if ($referenceUrl !== null && $this->detailScore($referenceUrl) > 0) {
            $detailUrls = array_values(array_filter(
                $urls,
                fn (string $url): bool => $this->detailScore($url) > 0,
            ));
            if ($detailUrls !== []) {
                $urls = $detailUrls;
            }
        }
        $count = count($urls);

        if ($count <= $limit) {
            return $urls;
        }

        return array_map(
            fn (int $position): string => $urls[(int) round($position * ($count - 1) / ($limit - 1))],
            range(0, $limit - 1),
        );
    }

    private function detailScore(string $url): int
    {
        $parts = parse_url($url);
        $path = strtolower((string) ($parts['path'] ?? ''));
        $query = strtolower((string) ($parts['query'] ?? ''));

        return preg_match('~/(?:imovel|property)/~', $path) === 1
            || preg_match('~/\d+/?$~', $path) === 1
            || preg_match('~(?:^|&)imovel=\d+(?:&|$)~', $query) === 1
            || preg_match('~/detalhes_(?:loc|vd)\.php$~', $path) === 1
            ? 100
            : 0;
    }
}
