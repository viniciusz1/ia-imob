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
        if (empty($roleIdentifier)) {
            // Optional: You could choose to remove all roles if null is passed
            $user->syncRoles([]);
            return;
        }

        // We use syncRoles replacing any previous role the user had. 
        // If the system allows multiple roles per user, you could use assignRole().
        // For standard "Group" logic, syncRoles ensures they stay in exactly the specified group.
        $user->syncRoles([$roleIdentifier]);
    }
}
