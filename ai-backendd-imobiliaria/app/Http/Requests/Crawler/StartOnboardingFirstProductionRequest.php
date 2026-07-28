<?php

namespace App\Http\Requests\Crawler;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StartOnboardingFirstProductionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'discovery_mode' => [
                'nullable',
                Rule::in(['fresh', 'validation_snapshot']),
            ],
        ];
    }
}
