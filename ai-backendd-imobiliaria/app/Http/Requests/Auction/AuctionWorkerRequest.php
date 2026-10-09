<?php

declare(strict_types=1);

namespace App\Http\Requests\Auction;

use App\Enums\Auction\AuctionCrawlRunStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Payloads sent by the Python auction worker. Authentication is handled by
 * the EnsureAuctionCrawlerToken middleware, so authorize() always passes.
 */
class AuctionWorkerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return match ($this->route()?->getActionMethod()) {
            'claim' => [
                'worker_key' => ['required', 'string', 'max:100'],
            ],
            'progress' => [
                'stage' => ['nullable', 'string', 'max:255'],
                'sitemaps_read' => ['sometimes', 'integer', 'min:0'],
                'urls_found' => ['sometimes', 'integer', 'min:0'],
                'urls_total' => ['sometimes', 'integer', 'min:0'],
                'processed' => ['sometimes', 'integer', 'min:0'],
                'failed' => ['sometimes', 'integer', 'min:0'],
                'log' => ['sometimes', 'array', 'max:200'],
                'log.*.at' => ['nullable', 'string', 'max:40'],
                'log.*.level' => ['nullable', Rule::in(['debug', 'info', 'success', 'warning', 'error'])],
                'log.*.message' => ['required', 'string'],
            ],
            'records' => [
                'records' => ['required', 'array', 'min:1', 'max:50'],
            ],
            'finish' => [
                'status' => ['required', Rule::in([
                    AuctionCrawlRunStatus::Succeeded->value,
                    AuctionCrawlRunStatus::Failed->value,
                    AuctionCrawlRunStatus::Cancelled->value,
                ])],
                'error' => ['nullable', 'string', 'max:5000'],
            ],
            default => [],
        };
    }
}
