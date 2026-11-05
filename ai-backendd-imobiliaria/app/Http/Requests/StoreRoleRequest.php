<?php

namespace App\Http\Requests;

use App\Support\PermissionGuard;
use App\Support\PlatformPermissions;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Exists;

class StoreRoleRequest extends FormRequest
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
        $guard = PermissionGuard::name();

        return [
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('roles', 'name')->where('guard_name', $guard),
            ],
            'permissions' => ['required', 'array'],
            'permissions.*' => ['integer', $this->permissionExistsRule()],
        ];
    }

    /** Agency users may only grant agency-level permissions. */
    private function permissionExistsRule(): Exists
    {
        $rule = Rule::exists('permissions', 'id');

        if (PlatformPermissions::isAgencyActor($this->user())) {
            $rule->where(fn ($query) => PlatformPermissions::whereAgency($query));
        }

        return $rule;
    }
}
