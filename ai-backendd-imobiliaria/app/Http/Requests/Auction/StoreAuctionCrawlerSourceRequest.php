<?php

declare(strict_types=1);

namespace App\Http\Requests\Auction;

use Closure;
use Illuminate\Foundation\Http\FormRequest;

class StoreAuctionCrawlerSourceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null && $this->user()->can('crawler.agencies.manage');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'sitemap_url' => ['required', 'url', 'max:1024'],
            'url_pattern' => ['nullable', 'string', 'max:255', self::regexRule()],
            'max_urls' => ['nullable', 'integer', 'min:1', 'max:5000'],
        ];
    }

    /**
     * @return array{sitemap_url: string, url_pattern: string|null, max_urls: int}
     */
    public function config(): array
    {
        return [
            'sitemap_url' => (string) $this->validated('sitemap_url'),
            'url_pattern' => $this->validated('url_pattern') ?: null,
            'max_urls' => (int) ($this->validated('max_urls') ?? 50),
        ];
    }

    public static function regexRule(): Closure
    {
        return static function (string $attribute, mixed $value, Closure $fail): void {
            if (! is_string($value) || $value === '') {
                return;
            }

            if (@preg_match('~'.str_replace('~', '\~', $value).'~i', '') === false) {
                $fail('O filtro de URL não é uma expressão regular válida.');
            }
        };
    }
}
