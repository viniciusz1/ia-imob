<?php

namespace App\Http\Requests\NewProperties;

use Illuminate\Foundation\Http\FormRequest;

class IndexNewPropertiesRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user !== null
            && $user->agency_id !== null
            && $user->hasPermissionTo('properties.view');
    }

    public function rules(): array
    {
        return [
            'agency_id' => ['sometimes', 'integer', 'min:1'],
            'city' => ['sometimes', 'string', 'max:150'],
            'neighborhood' => ['sometimes', 'string', 'max:150'],
            'type' => ['sometimes', 'string', 'max:100'],
            'purpose' => ['sometimes', 'in:venda,locacao'],
            'flag' => ['sometimes', 'in:all,new,opportunity,both'],
            'search' => ['sometimes', 'string', 'max:200'],
            'bedrooms' => ['sometimes', 'in:1,2,3,4,5+'],
            'bathrooms' => ['sometimes', 'in:1,2,3,4,5+'],
            'parking' => ['sometimes', 'in:1,2,3,4,5+'],
            'sort' => ['sometimes', 'in:identified_desc,identified_asc,opportunity_desc'],
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ];
    }
}
