<?php

namespace App\Http\Requests\Crawler;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class OperationGroupActionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'action' => ['required', Rule::in(['cancel', 'retry'])],
            'operation_ids' => ['required', 'array', 'min:1'],
            'operation_ids.*' => ['integer', 'distinct'],
        ];
    }
}
