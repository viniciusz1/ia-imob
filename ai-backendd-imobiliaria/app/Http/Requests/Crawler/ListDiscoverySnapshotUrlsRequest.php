<?php

namespace App\Http\Requests\Crawler;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListDiscoverySnapshotUrlsRequest extends FormRequest
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
        return [
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', Rule::in([20, 30, 100])],
        ];
    }
}
