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
        return [];
    }
}
