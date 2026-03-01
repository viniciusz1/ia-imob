<?php

declare(strict_types=1);

namespace App\Actions\Role;

use Spatie\Permission\Models\Role;

class UpdateRoleAction
{
    /**
     * @param Role $role
     * @param string $name
     * @param array $permissions Array of permission IDs or Names
     * @return Role
     */
    public function execute(Role $role, string $name, array $permissions): Role
    {
        $role->update(['name' => $name]);

        $role->syncPermissions($permissions);

        return $role;
    }
}
