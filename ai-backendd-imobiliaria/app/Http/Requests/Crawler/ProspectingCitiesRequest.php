<?php

namespace App\Http\Requests\Crawler;

use Illuminate\Foundation\Http\FormRequest;

class ProspectingCitiesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'cities' => ['required', 'array', 'min:1', 'max:50'],
            'cities.*.city' => ['required', 'string', 'max:120'],
            'cities.*.state' => ['required', 'string', 'size:2'],
            'requery_known_domains' => ['sometimes', 'boolean'],
            'confirmed_known_domain_count' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
