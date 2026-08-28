import { beforeEach, describe, expect, it, vi } from "vitest";

import api from "../api";
import { getNewProperties } from "../newPropertiesService";
import type { NewPropertiesResponse } from "@/types/newProperties";

vi.mock("../api", () => ({
  API_PREFIX: "/api/v1",
  default: { get: vi.fn() },
}));

describe("newPropertiesService", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
  });

  it("loads the grouped new-properties feed", async () => {
    const payload: NewPropertiesResponse = {
      data: [],
      meta: {
        updated_at: "2026-08-27T12:00:00-03:00",
        total: 0,
        total_new: 0,
        total_opportunities: 0,
      },
    };
    vi.mocked(api.get).mockResolvedValue({ data: payload });

    await expect(getNewProperties()).resolves.toEqual(payload);
    expect(api.get).toHaveBeenCalledWith("/api/v1/new-properties");
  });
});
