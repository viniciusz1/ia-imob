<?php

declare(strict_types=1);

namespace App\Actions\Role;

use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class UpdateRoleAction
{
    /**
     * @param  array  $permissions  Array of permission IDs or Names
     */
    public function execute(Role $role, string $name, array $permissions): Role
    {
        $guard = $this->permissionGuard();

        $role->update([
            'name' => $name,
            'guard_name' => $guard,
        ]);

        $role->syncPermissions($this->normalizePermissionIdsForGuard($permissions, $guard));

        return $role;
    }

    /**
     * @param  array<int, int|string>  $permissions
     * @return array<int, int>
     */
    private function normalizePermissionIdsForGuard(array $permissions, string $guard): array
    {
        return collect($permissions)
            ->map(function (int|string $permission) use ($guard): ?int {
                $sourcePermission = is_numeric($permission)
                    ? Permission::query()->find((int) $permission)
                    : Permission::query()->where('name', (string) $permission)->first();

                if (! $sourcePermission) {
                    return null;
                }

                if ($sourcePermission->guard_name === $guard) {
                    return (int) $sourcePermission->id;
                }

                $targetPermission = Permission::query()->firstOrCreate([
                    'name' => (string) $sourcePermission->name,
                    'guard_name' => $guard,
                ]);

                return (int) $targetPermission->id;
            })
            ->filter(fn (?int $id): bool => $id !== null)
            ->unique()
            ->values()
            ->all();
    }

    /**
     * Fixed guard for Spatie roles/permissions.
     * auth:sanctum mutates config('auth.defaults.guard') at runtime,
     * so we always use the guard the tables were seeded with.
     */
    private function permissionGuard(): string
    {
        return 'web';
    }
}
