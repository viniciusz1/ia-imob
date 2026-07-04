<?php

namespace App\Services;

use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthService
{
    /**
     * Attempt to authenticate the user and update last_seen_at.
     *
     * @return \App\Models\User
     *
     * @throws ValidationException
     */
    public function attemptLogin(array $credentials)
    {
        // Check if login is email or username
        $loginField = filter_var($credentials['login'], FILTER_VALIDATE_EMAIL) ? 'email' : 'username';

        $authCredentials = [
            $loginField => $credentials['login'],
            'password' => $credentials['password'],
        ];

        if (! Auth::attempt($authCredentials)) {
            throw ValidationException::withMessages([
                'login' => __('auth.failed'),
            ]);
        }

        /** @var \App\Models\User $user */
        $user = Auth::user();

        if (! $user->is_active) {
            Auth::logout();
            throw ValidationException::withMessages([
                'login' => 'Conta inativa. Entre em contato com o administrador.',
            ]);
        }

        // Update last seen
        $user->update(['last_seen_at' => now()]);

        return $user;
    }

    /**
     * Logout the user
     */
    public function logout(): void
    {
        Auth::guard('web')->logout();
        request()->session()->invalidate();
        request()->session()->regenerateToken();
    }
}
