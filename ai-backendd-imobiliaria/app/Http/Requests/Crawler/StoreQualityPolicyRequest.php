<?php

namespace App\Http\Requests\Crawler;

use Illuminate\Foundation\Http\FormRequest;

class StoreQualityPolicyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'rules' => ['required', 'array'],
            'rules.maximum_stock_drop_ratio' => ['required', 'numeric', 'between:0,1'],
            'rules.maximum_error_ratio' => ['required', 'numeric', 'between:0,1'],
            'rules.maximum_rejection_ratio' => ['required', 'numeric', 'between:0,1'],
        ];
    }
}
