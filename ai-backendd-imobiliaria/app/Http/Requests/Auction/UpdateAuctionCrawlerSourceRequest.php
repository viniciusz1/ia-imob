<?php

declare(strict_types=1);

namespace App\Http\Requests\Auction;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAuctionCrawlerSourceRequest extends FormRequest
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
            'name' => ['sometimes', 'string', 'max:255'],
            'sitemap_url' => ['sometimes', 'url', 'max:1024'],
            'url_pattern' => ['sometimes', 'nullable', 'string', 'max:255', StoreAuctionCrawlerSourceRequest::regexRule()],
            'max_urls' => ['sometimes', 'integer', 'min:1', 'max:5000'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
