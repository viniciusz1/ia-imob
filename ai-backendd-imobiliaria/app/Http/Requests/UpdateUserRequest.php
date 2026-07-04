<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        $targetUser = $this->route('user');

        if (! $targetUser instanceof User) {
            $targetUser = User::query()->find((int) $targetUser);
        }

        if (! $targetUser) {
            return true;
        }

        return $this->user()?->can('update', $targetUser) ?? false;
    }

    public function rules(): array
    {
        $userId = $this->route('user');
        $guard = (string) config('auth.defaults.guard', 'web');

        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'max:255', Rule::unique('users', 'email')->ignore($userId)],
            'phone' => ['sometimes', 'string', 'max:30'],
            'creci' => ['nullable', 'string', 'max:30'],
            'order' => ['sometimes', 'integer', 'min:0'],
            'person_type' => ['sometimes', 'string', 'size:1', 'in:F,J'],
            'notes' => ['nullable', 'string'],
            'group_id' => ['prohibited'],
            'role_id' => ['nullable', 'integer', Rule::exists('roles', 'id')->where('guard_name', $guard)],
            'team_id' => ['nullable', 'integer'],
            'username' => ['sometimes', 'string', 'max:100', Rule::unique('users', 'username')->ignore($userId)],
            'password' => ['nullable', 'string', 'min:8', 'confirmed'],
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
