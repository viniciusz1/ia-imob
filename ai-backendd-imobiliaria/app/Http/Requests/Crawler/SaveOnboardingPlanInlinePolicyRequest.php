<?php

namespace App\Http\Requests\Crawler;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveOnboardingPlanInlinePolicyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'kind' => ['required', Rule::in(['discovery', 'extraction'])],
            'name' => ['required', 'string', 'max:160'],
            'confirmed' => ['required', 'accepted'],
        ];
    }
}
