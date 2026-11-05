<?php

namespace App\Http\Requests\Crawler;

use Illuminate\Foundation\Http\FormRequest;

class QueueBulkProductionCrawlRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'confirmed' => ['required', 'accepted'],
            'request_key' => ['nullable', 'uuid'],
        ];
    }
}
