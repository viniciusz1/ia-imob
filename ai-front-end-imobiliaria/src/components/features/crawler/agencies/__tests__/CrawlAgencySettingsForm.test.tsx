import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { updateCrawlAgency } from "@/services/crawlerService";
import type { CrawlAgency } from "@/types/crawler";
import { CrawlAgencySettingsForm } from "../CrawlAgencySettingsForm";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock("@/services/crawlerService", () => ({
  updateCrawlAgency: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const agency: CrawlAgency = {
  id: 27,
  name: "Imobiliária Piermann",
  slug: "imobiliaria-piermann",
  base_url: "http://www.piermann.com.br/",
  root_domain: "piermann.com.br",
  lifecycle_state: "onboarding",
  health_state: "unknown",
  revalidation_required: false,
  active_discovery_policy_version_id: null,
  active_discovery_policy: null,
  current_published_crawl_run_id: null,
  created_at: "2026-08-01T00:00:00Z",
  updated_at: "2026-08-01T00:00:00Z",
};

describe("CrawlAgencySettingsForm", () => {
  beforeEach(() => {
    refresh.mockReset();
    vi.mocked(updateCrawlAgency).mockReset().mockResolvedValue({
      ...agency,
      base_url: "https://6035.apre.me/",
      root_domain: "6035.apre.me",
    });
  });

  it("lets the operator correct the source identity", async () => {
    render(<CrawlAgencySettingsForm agency={agency} />);

    fireEvent.change(screen.getByLabelText("URL base"), {
      target: { value: "https://6035.apre.me/" },
    });
    fireEvent.change(screen.getByLabelText("Domínio raiz"), {
      target: { value: "6035.apre.me" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar identidade" }));

    await waitFor(() => expect(updateCrawlAgency).toHaveBeenCalledWith(27, {
      name: "Imobiliária Piermann",
      slug: "imobiliaria-piermann",
      base_url: "https://6035.apre.me/",
      root_domain: "6035.apre.me",
    }));
    expect(refresh).toHaveBeenCalledOnce();
  });
});
