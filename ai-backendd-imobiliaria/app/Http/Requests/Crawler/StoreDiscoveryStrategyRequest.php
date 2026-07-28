<?php

namespace App\Http\Requests\Crawler;

use App\Models\Crawler\DiscoveryStrategy;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDiscoveryStrategyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'key' => [
                'required',
                'string',
                'max:80',
                'regex:/^[a-z][a-z0-9_]*$/',
                Rule::unique(DiscoveryStrategy::class, 'key'),
            ],
            'label' => ['required', 'string', 'max:160'],
            'safety_status' => ['required', Rule::in(['safe', 'blocked'])],
        ];
    }
}
