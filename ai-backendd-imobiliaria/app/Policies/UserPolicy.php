<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    public function viewAny(?User $authUser): bool
    {
        return true;
    }

    public function view(?User $authUser, User $user): bool
    {
        return true;
    }

    public function create(?User $authUser): bool
    {
        return true;
    }

    public function update(?User $authUser, User $user): bool
    {
        return true;
    }

    public function delete(?User $authUser, User $user): bool
    {
        return true;
    }
}
