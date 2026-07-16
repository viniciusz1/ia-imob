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

export function postLoginPath(userPermissions: string[] | null | undefined): string {
  if (hasPermission(userPermissions, "crawler.view")) return "/admin/crawler";
  if (hasPermission(userPermissions, "platform.agencies.view")) return "/admin/agencies";

  return "/";
}
