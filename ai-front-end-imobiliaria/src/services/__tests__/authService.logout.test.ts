import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn().mockResolvedValue(undefined),
  post: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../api", () => ({
  API_PREFIX: "/api/v1",
  default: mocks,
}));

import { authService } from "../authService";

describe("authService.logout", () => {
  it("renews the CSRF cookie before posting logout", async () => {
    await authService.logout();

    expect(mocks.get).toHaveBeenCalledWith("/sanctum/csrf-cookie");
    expect(mocks.post).toHaveBeenCalledWith("/api/v1/logout");
    expect(mocks.get.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.post.mock.invocationCallOrder[0],
    );
  });
});
