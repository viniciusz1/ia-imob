<?php

declare(strict_types=1);

namespace App\Actions\Role;

use Spatie\Permission\Models\Role;

class CreateRoleAction
{
    /**
     * @param string $name
     * @param array $permissions Array of permission IDs or Names
     * @return Role
     */
    public function execute(string $name, array $permissions): Role
    {
        $role = Role::create([
            'name' => $name,
            'guard_name' => 'sanctum',
        ]);

        if (!empty($permissions)) {
            $role->syncPermissions($permissions);
        }

        return $role;
    }
}
