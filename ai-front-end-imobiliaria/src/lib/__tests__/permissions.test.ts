import { describe, expect, it } from "vitest";

import { hasPermission } from "../permissions";

describe("hasPermission", () => {
  it("returns true when the user has the required permission", () => {
    expect(hasPermission(["properties.view"], "properties.view")).toBe(true);
  });

  it("returns false when the user does not have the required permission", () => {
    expect(hasPermission(["properties.view"], "users.view")).toBe(false);
  });

  it("returns true for any-of mode when the user has at least one permission", () => {
    expect(hasPermission(["properties.view"], ["users.view", "properties.view"], "any")).toBe(true);
  });

  it("returns false for any-of mode when the user has none of the permissions", () => {
    expect(hasPermission(["properties.view"], ["users.view", "roles.manage"], "any")).toBe(false);
  });

  it("returns true for all-of mode when the user has every permission", () => {
    expect(hasPermission(["properties.view", "users.view"], ["properties.view", "users.view"], "all")).toBe(true);
  });

  it("returns false for all-of mode when the user is missing a permission", () => {
    expect(hasPermission(["properties.view"], ["properties.view", "users.view"], "all")).toBe(false);
  });

  it("returns true when no permissions are required", () => {
    expect(hasPermission(["properties.view"], [])).toBe(true);
  });

  it("returns false when user permissions are missing", () => {
    expect(hasPermission(null, "properties.view")).toBe(false);
    expect(hasPermission(undefined, "properties.view")).toBe(false);
  });
});
