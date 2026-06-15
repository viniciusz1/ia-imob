<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RegisterAgencyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Gating happens in the route middleware (can:platform.agencies.create)
    }

    public function rules(): array
    {
        return [
            'agency.name' => ['required', 'string', 'max:255'],
            'agency.slug' => ['required', 'string', 'max:255', 'unique:agencies,slug'],
            'agency.phone' => ['nullable', 'string', 'max:30'],
            'agency.email' => ['nullable', 'email', 'max:255'],
            'agency.document' => ['nullable', 'string', 'max:30'],

            'admin.name' => ['required', 'string', 'max:255'],
            'admin.email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'admin.username' => ['required', 'string', 'max:255', 'unique:users,username'],
            'admin.phone' => ['nullable', 'string', 'max:30'],
            'admin.password' => ['required', 'string', 'min:8', 'confirmed'],
        ];
    }
}
