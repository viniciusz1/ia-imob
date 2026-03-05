<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

class DestroyUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        $targetUser = $this->route('user');

        if (!$targetUser instanceof User) {
            $targetUser = User::query()->find((int) $targetUser);
        }

        if (!$targetUser) {
            return true;
        }

        return $this->user()?->can('delete', $targetUser) ?? false;
    }

    public function rules(): array
    {
        return [];
    }
}
