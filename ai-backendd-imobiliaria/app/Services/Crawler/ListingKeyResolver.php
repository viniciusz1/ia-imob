<?php

namespace App\Services\Crawler;

class ListingKeyResolver
{
    private const EXTERNAL_ID_FIELDS = ['external_id', 'listing_id', 'codigo', 'code', 'id'];

    public function resolve(array $payload, ?string $url): string
    {
        foreach (self::EXTERNAL_ID_FIELDS as $field) {
            $value = $payload[$field] ?? null;
            if ((is_string($value) || is_int($value)) && trim((string) $value) !== '') {
                return 'external:'.trim((string) $value);
            }
        }

        return 'url:'.hash('sha256', $this->canonicalizeUrl((string) $url));
    }

    public function externalId(array $payload): ?string
    {
        foreach (self::EXTERNAL_ID_FIELDS as $field) {
            $value = $payload[$field] ?? null;
            if ((is_string($value) || is_int($value)) && trim((string) $value) !== '') {
                return trim((string) $value);
            }
        }

        return null;
    }

    public function canonicalizeUrl(string $url): string
    {
        $parts = parse_url(trim($url));
        if ($parts === false || ! isset($parts['host'])) {
            return trim($url);
        }
        $scheme = strtolower((string) ($parts['scheme'] ?? 'https'));
        $host = strtolower($parts['host']);
        $port = isset($parts['port']) && ! (($scheme === 'https' && $parts['port'] === 443) || ($scheme === 'http' && $parts['port'] === 80))
            ? ':'.$parts['port']
            : '';
        $path = preg_replace('#/+#', '/', (string) ($parts['path'] ?? '/')) ?: '/';
        $path = $path === '/' ? '/' : rtrim($path, '/');
        $query = [];
        parse_str((string) ($parts['query'] ?? ''), $query);
        $query = array_filter(
            $query,
            fn (string $key): bool => ! str_starts_with(strtolower($key), 'utm_')
                && ! in_array(strtolower($key), ['fbclid', 'gclid'], true),
            ARRAY_FILTER_USE_KEY,
        );
        ksort($query);
        $queryString = http_build_query($query, '', '&', PHP_QUERY_RFC3986);

        return "{$scheme}://{$host}{$port}{$path}".($queryString === '' ? '' : "?{$queryString}");
    }
}
