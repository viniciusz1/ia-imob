<?php

namespace App\Http\Requests\Crawler;

use App\Models\Crawler\OnboardingExecutionModelVersion;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateOnboardingPlanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:160'],
            'conduction' => ['required', Rule::in(['automated'])],
            'execution_model_version_id' => [
                'required',
                'integer',
                Rule::exists(OnboardingExecutionModelVersion::class, 'id')->where('status', 'available'),
            ],
        ];
    }
}
