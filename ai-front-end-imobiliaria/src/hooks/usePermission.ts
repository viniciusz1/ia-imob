import { useAuthStore } from "@/store/useAuthStore";
import { hasPermission } from "@/lib/permissions";

export function usePermission(
  required: string | string[],
  mode: "any" | "all" = "any"
): boolean {
  const userPermissions = useAuthStore((state) => state.user?.permissions);
  return hasPermission(userPermissions, required, mode);
}
