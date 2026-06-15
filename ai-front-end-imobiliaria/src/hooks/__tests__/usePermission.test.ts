import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { usePermission } from "../usePermission";
import { useAuthStore } from "@/store/useAuthStore";

describe("usePermission", () => {
  it("returns true when the user has the required permission", () => {
    useAuthStore.getState().setUser({
      id: 1,
      name: "Admin",
      email: "admin@example.com",
      permissions: ["properties.view"],
    });

    const { result } = renderHook(() => usePermission("properties.view"));

    expect(result.current).toBe(true);
  });

  it("returns false when the user does not have the required permission", () => {
    useAuthStore.getState().setUser({
      id: 1,
      name: "Admin",
      email: "admin@example.com",
      permissions: ["properties.view"],
    });

    const { result } = renderHook(() => usePermission("users.view"));

    expect(result.current).toBe(false);
  });

  it("returns true for any-of mode when the user has at least one permission", () => {
    useAuthStore.getState().setUser({
      id: 1,
      name: "Admin",
      email: "admin@example.com",
      permissions: ["valuations.view"],
    });

    const { result } = renderHook(() => usePermission(["valuations.create", "valuations.view"], "any"));

    expect(result.current).toBe(true);
  });

  it("returns false when there is no authenticated user", () => {
    useAuthStore.getState().clearAuth();

    const { result } = renderHook(() => usePermission("properties.view"));

    expect(result.current).toBe(false);
  });
});
