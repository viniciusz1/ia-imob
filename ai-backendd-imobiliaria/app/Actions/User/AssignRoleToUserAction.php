<?php

declare(strict_types=1);

namespace App\Actions\User;

use App\Models\User;
use Spatie\Permission\Models\Role;

class AssignRoleToUserAction
{
    /**
     * @param User $user
     * @param int|string|null $roleIdentifier Role ID or Name
     * @return void
     */
    public function execute(User $user, int|string|null $roleIdentifier): void
    {
        $guard = (string) config('auth.defaults.guard', 'web');

        if (empty($roleIdentifier)) {
            $user->syncRoles([]);
            return;
        }

        if (is_numeric($roleIdentifier)) {
            $role = Role::query()
                ->where('id', (int) $roleIdentifier)
                ->where('guard_name', $guard)
                ->firstOrFail();
            $user->syncRoles([$role]);
        } else {
            $role = Role::query()
                ->where('name', (string) $roleIdentifier)
                ->where('guard_name', $guard)
                ->firstOrFail();
            $user->syncRoles([$role]);
        }
    }
}
