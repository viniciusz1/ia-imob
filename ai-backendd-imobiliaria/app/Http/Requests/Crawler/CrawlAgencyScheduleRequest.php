<?php

namespace App\Http\Requests\Crawler;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CrawlAgencyScheduleRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'inherit_default' => ['required', 'boolean'],
            'preset' => [Rule::requiredIf(! $this->boolean('inherit_default')), 'nullable', Rule::in(['manual', 'daily', 'twice_weekly', 'weekly'])],
            'timezone' => [Rule::requiredIf(! $this->boolean('inherit_default')), 'nullable', 'string', 'timezone:all'],
        ];
    }
}
