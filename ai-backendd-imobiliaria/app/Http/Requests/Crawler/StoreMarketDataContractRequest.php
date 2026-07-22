<?php

namespace App\Http\Requests\Crawler;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMarketDataContractRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'fields' => ['required', 'array', 'min:1'],
            'fields.*.name' => ['required', 'string', 'max:100', 'distinct'],
            'fields.*.type' => ['required', Rule::in(['string', 'integer', 'decimal', 'boolean', 'date', 'url', 'array'])],
            'fields.*.required' => ['required', 'boolean'],
            'fields.*.normalization' => ['present', 'array'],
            'fields.*.normalization.*' => ['string', 'max:100'],
        ];
    }
}
