import { beforeEach, describe, expect, it, vi } from "vitest";

import api from "../api";
import {
  adoptOnboardingDiscoverySnapshot,
  listCrawlAgenciesPage,
  listOnboardingDiscoverySnapshotCandidates,
} from "../crawlerService";

vi.mock("../api", () => ({
  API_PREFIX: "/api/v1",
  default: { get: vi.fn(), post: vi.fn() },
}));

describe("crawlerService pagination", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
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

  it("loads adoption candidates for the current Onboarding execution", async () => {
    const candidates = [{
      id: 33,
      operation_id: 78,
      crawl_agency_id: 42,
      url_count: 36,
      content_hash: "snapshot",
      created_at: "2026-08-01T13:44:36Z",
      adoption: {
        eligible: true,
        reason: null,
        sample_url: "https://seculus.net/imovel/1",
        age_warning: null,
      },
    }];
    vi.mocked(api.get).mockResolvedValue({ data: { data: candidates } });

    await expect(listOnboardingDiscoverySnapshotCandidates(91)).resolves.toEqual(candidates);
    expect(api.get).toHaveBeenCalledWith(
      "/api/v1/admin/crawler/onboarding-executions/91/discovery-snapshot-candidates",
    );
  });

  it("adopts a Snapshot through the Onboarding continuation command", async () => {
    const execution = { id: 91, discovery_snapshot_id: 33 };
    vi.mocked(api.post).mockResolvedValue({ data: { data: execution } });

    await expect(adoptOnboardingDiscoverySnapshot(91, 33, "Resultado revisado")).resolves.toEqual(execution);
    expect(api.post).toHaveBeenCalledWith(
      "/api/v1/admin/crawler/onboarding-executions/91/adopt-discovery-snapshot",
      { discovery_snapshot_id: 33, note: "Resultado revisado" },
    );
  });
});
