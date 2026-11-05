<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Spatie\Permission\Models\Role;

/**
 * Platform-level capabilities (`platform.*`, `crawler.*`) belong to Platform
 * Admins only. Agency users — the ones with an agency_id — must never see,
 * grant or receive them, neither directly nor through a group.
 */
final class PlatformPermissions
{
    /** @var list<string> */
    public const PREFIXES = ['platform.', 'crawler.'];

    public static function isAgencyActor(?User $user): bool
    {
        return $user !== null && $user->agency_id !== null;
    }

    public static function isPlatformPermission(string $name): bool
    {
        foreach (self::PREFIXES as $prefix) {
            if (str_starts_with($name, $prefix)) {
                return true;
            }
        }

        return false;
    }

    /** Restricts a permissions query to platform-level permissions. */
    public static function wherePlatform(Builder|QueryBuilder $query, string $column = 'name'): Builder|QueryBuilder
    {
        return $query->where(function (Builder|QueryBuilder $inner) use ($column): void {
            foreach (self::PREFIXES as $prefix) {
                $inner->orWhere($column, 'like', $prefix.'%');
            }
        });
    }

    /** Restricts a permissions query to agency-level permissions. */
    public static function whereAgency(Builder|QueryBuilder $query, string $column = 'name'): Builder|QueryBuilder
    {
        foreach (self::PREFIXES as $prefix) {
            $query->where($column, 'not like', $prefix.'%');
        }

        return $query;
    }

    public static function roleGrantsPlatformAccess(Role $role): bool
    {
        return $role->permissions()
            ->where(fn (Builder $query) => self::wherePlatform($query))
            ->exists();
    }

    /** @return list<int> ids of the roles that carry any platform-level permission */
    public static function platformRoleIds(): array
    {
        return Role::query()
            ->whereHas('permissions', fn (Builder $query) => self::wherePlatform($query))
            ->pluck('id')
            ->map(fn ($id): int => (int) $id)
            ->all();
    }
}
