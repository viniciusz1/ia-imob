<?php

namespace App\Http\Requests\Crawler;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ScheduleDefaultRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'preset' => ['required', Rule::in(['manual', 'daily', 'twice_weekly', 'weekly'])],
            'timezone' => ['required', 'string', 'timezone:all'],
        ];
    }
}
