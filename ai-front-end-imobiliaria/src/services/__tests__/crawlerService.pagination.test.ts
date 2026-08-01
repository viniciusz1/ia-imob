import { beforeEach, describe, expect, it, vi } from "vitest";

import api from "../api";
import { listCrawlAgenciesPage } from "../crawlerService";

vi.mock("../api", () => ({
  API_PREFIX: "/api/v1",
  default: { get: vi.fn() },
}));

describe("crawlerService pagination", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
  });

  it("returns pagination metadata and sends page and search to the API", async () => {
    const response = {
      data: [{ id: 35, name: "Séculus Imobiliária" }],
      meta: { current_page: 2, last_page: 2, per_page: 15, total: 23, from: 16, to: 23 },
      links: { first: null, last: null, prev: null, next: null },
    };
    vi.mocked(api.get).mockResolvedValue({ data: response });

    const result = await listCrawlAgenciesPage({ page: 2, search: "seculus.net" });

    expect(api.get).toHaveBeenCalledWith("/api/v1/admin/crawler/crawl-agencies", {
      params: { page: 2, search: "seculus.net" },
    });
    expect(result).toEqual(response);
  });
});
