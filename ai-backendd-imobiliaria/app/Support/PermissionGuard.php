<?php

namespace App\Support;

/**
 * Guard name the roles and permissions are registered under.
 *
 * Request-time code must not read `auth.defaults.guard`: the `auth:sanctum`
 * middleware switches it to "sanctum" for API requests, so role and
 * permission queries filtered by it come back empty.
 */
final class PermissionGuard
{
    public const NAME = 'web';

    public static function name(): string
    {
        return self::NAME;
    }
}
