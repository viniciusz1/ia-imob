<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['required', 'string', 'max:30'],
            'creci' => ['nullable', 'string', 'max:30'],
            'order' => ['sometimes', 'integer', 'min:0'],
            'person_type' => ['required', 'string', 'size:1', 'in:F,J'],
            'notes' => ['nullable', 'string'],
            'group_id' => ['nullable', 'integer'],
            'team_id' => ['nullable', 'integer'],
            'username' => ['required', 'string', 'max:100', 'unique:users,username'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'avatar' => ['nullable', 'image', 'max:2048'],
            'is_active' => ['sometimes', 'boolean'],
            'show_on_website' => ['sometimes', 'boolean'],
            'has_broker_page' => ['sometimes', 'boolean'],
            'work_period_1_start' => ['nullable', 'date_format:H:i'],
            'work_period_1_end' => ['nullable', 'date_format:H:i', 'after:work_period_1_start'],
            'work_period_2_start' => ['nullable', 'date_format:H:i'],
            'work_period_2_end' => ['nullable', 'date_format:H:i', 'after:work_period_2_start'],
            'website_name' => ['nullable', 'string', 'max:255'],
            'facebook_link' => ['nullable', 'url', 'max:500'],
            'instagram_link' => ['nullable', 'url', 'max:500'],
            'description' => ['nullable', 'string'],
        ];
    }
}
