<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateRoleRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() && $this->user()->can('roles.manage');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $roleId = $this->route('role')->id ?? $this->route('role');

        return [
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('roles', 'name')
                    ->where('guard_name', $this->permissionGuard())
                    ->ignore($roleId),
            ],
            'permissions' => ['required', 'array'],
            'permissions.*' => ['integer', Rule::exists('permissions', 'id')],
        ];
    }

    /**
     * Fixed guard for Spatie roles/permissions.
     * auth:sanctum mutates config('auth.defaults.guard') at runtime.
     */
    private function permissionGuard(): string
    {
        return 'web';
    }
}
