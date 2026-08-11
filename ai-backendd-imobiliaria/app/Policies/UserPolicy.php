<?php

namespace App\Policies;

use App\Models\User;

/**
 * Authorization for CRM users.
 *
 * Two rules apply to every single-user decision: the actor needs the matching
 * `users.*` permission, and the target has to live in the actor's own Agency.
 * The Agency check is what keeps one Agency Admin out of another Agency's
 * users — `users` carries `agency_id` but no Agency Scope, so nothing else in
 * the request pipeline enforces the boundary.
 *
 * A Platform Admin belongs to no Agency and therefore shares an Agency with
 * nobody: administering an Agency's users is the Agency Admin's job, not
 * theirs (see docs/contexts/access-control/CONTEXT.md).
 */
class UserPolicy
{
    public function viewAny(User $authUser): bool
    {
        return $authUser->can('users.view');
    }

    public function view(User $authUser, User $user): bool
    {
        return $authUser->can('users.view') && $this->sharesAgency($authUser, $user);
    }

    public function create(User $authUser): bool
    {
        return $authUser->can('users.create');
    }

    public function update(User $authUser, User $user): bool
    {
        if (! $this->sharesAgency($authUser, $user)) {
            return false;
        }

        if ($authUser->is($user)) {
            return $authUser->can('users.edit.self') || $authUser->can('users.edit.all');
        }

        return $authUser->can('users.edit.all');
    }

    public function delete(User $authUser, User $user): bool
    {
        // Deleting yourself would lock the Agency out of its own workspace when
        // the actor is its only administrator.
        if ($authUser->is($user)) {
            return false;
        }

        return $authUser->can('users.delete') && $this->sharesAgency($authUser, $user);
    }

    private function sharesAgency(User $authUser, User $user): bool
    {
        return $authUser->agency_id !== null
            && $authUser->agency_id === $user->agency_id;
    }
}
