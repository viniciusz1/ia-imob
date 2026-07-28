<?php

namespace App\Http\Requests\Crawler;

use Illuminate\Foundation\Http\FormRequest;

class StoreDiscoveryPolicyVersionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:160'],
            'strategies' => ['required', 'array', 'min:1'],
            'strategies.*' => ['required', 'string', 'max:80', 'distinct'],
            'configuration' => ['sometimes', 'array'],
        ];
    }
}
