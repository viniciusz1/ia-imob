export function hasPermission(
  userPermissions: string[] | null | undefined,
  required: string | string[],
  mode: "any" | "all" = "any"
): boolean {
  const requiredArray = Array.isArray(required) ? required : [required];
  if (requiredArray.length === 0) return true;
  if (!userPermissions) return false;

  if (mode === "any") {
    return requiredArray.some((permission) => userPermissions.includes(permission));
  }

  return requiredArray.every((permission) => userPermissions.includes(permission));
}

interface AuthorizationSubject {
  is_platform_admin: boolean;
  permissions?: string[] | null;
}

export function postLoginPath(user: AuthorizationSubject): string {
  if (!user.is_platform_admin) return "/";
  if (hasPermission(user.permissions, "crawler.view")) return "/admin/crawler";
  if (hasPermission(user.permissions, "platform.agencies.view")) return "/admin/agencies";

  return "/";
}
