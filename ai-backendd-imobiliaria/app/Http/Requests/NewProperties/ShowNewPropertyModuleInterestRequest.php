<?php

declare(strict_types=1);

namespace App\Http\Requests\NewProperties;

use Illuminate\Foundation\Http\FormRequest;

class ShowNewPropertyModuleInterestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->agency_id !== null
            && ($this->user()?->can('properties.view') ?? false);
    }

    public function rules(): array
    {
        return [];
    }
}
