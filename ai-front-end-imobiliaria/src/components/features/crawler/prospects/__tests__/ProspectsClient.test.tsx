import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { promoteProspect } from "@/services/crawlerService";

import { ProspectsClient } from "../ProspectsClient";

const mocks = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock("@/services/crawlerService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/crawlerService")>();
  return { ...actual, promoteProspect: vi.fn() };
});

describe("ProspectsClient", () => {
  beforeEach(() => {
    mocks.push.mockReset();
  });

  it("queues a city and exposes automatic evidence and human review actions", () => {
    render(<ProspectsClient initialSuggestions={[{
      id: 2,
      crawl_agency_id: 3,
      operation_id: 5,
      differences: { name: "Suggested Name" },
      state: "pending",
      created_at: "2026-07-15T12:00:00Z",
    }]} initialProspects={[{
      id: 1,
      root_domain: null,
      google_place_id: "place-1",
      name: "Sem site",
      city: "Joinville",
      state: "SC",
      base_url: null,
      phone: null,
      address: null,
      source: "google_places",
      automatic_classification: "rejected",
      automatic_reason: "no_website",
      review_state: "pending",
      reviewed_by: null,
      reviewed_at: null,
      review_reason: null,
      promoted_crawl_agency_id: null,
      latest_operation_id: 5,
      metadata: {},
      created_at: "2026-07-15T12:00:00Z",
      updated_at: "2026-07-15T12:00:00Z",
    }]} />);

    expect(screen.getByRole("heading", { name: "Prospecção" })).toBeInTheDocument();
    expect(screen.getByLabelText("Cidade")).toBeInTheDocument();
    expect(screen.getByLabelText("UF")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Prospectar cidade" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Várias cidades" }));

    expect(screen.getByLabelText("Lista de cidades")).toBeInTheDocument();
    expect(screen.getByLabelText(/incluir domínios já conhecidos/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/filtrar por operação/i)).toBeInTheDocument();
    expect(screen.getByText("no_website")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aprovar Sem site" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rejeitar Sem site" })).toBeInTheDocument();
    expect(screen.getByText("Sugestões para Crawl Agencies existentes")).toBeInTheDocument();
    expect(screen.getByText(/Suggested Name/)).toBeInTheDocument();
  });

  it("opens the draft Onboarding Plan immediately after promotion", async () => {
    vi.mocked(promoteProspect).mockResolvedValue({
      crawl_agency: {
        id: 42,
        name: "Imóveis Litoral",
        slug: "imoveis-litoral",
        base_url: "https://litoral.example.com",
        root_domain: "litoral.example.com",
        lifecycle_state: "onboarding",
        health_state: "unknown",
        revalidation_required: false,
        current_published_crawl_run_id: null,
        active_discovery_policy_version_id: null,
        created_at: "2026-07-27T12:00:00Z",
        updated_at: "2026-07-27T12:00:00Z",
      },
      onboarding_plan: { id: 9, status: "draft", steps: [] },
    });

    render(<ProspectsClient initialProspects={[{
      id: 1,
      root_domain: "litoral.example.com",
      google_place_id: "place-1",
      name: "Imóveis Litoral",
      city: "Joinville",
      state: "SC",
      base_url: "https://litoral.example.com",
      phone: null,
      address: null,
      source: "google_places",
      automatic_classification: "candidate",
      automatic_reason: null,
      review_state: "approved",
      reviewed_by: 1,
      reviewed_at: "2026-07-27T12:00:00Z",
      review_reason: "Site revisado",
      promoted_crawl_agency_id: null,
      latest_operation_id: 5,
      metadata: {},
      created_at: "2026-07-27T12:00:00Z",
      updated_at: "2026-07-27T12:00:00Z",
    }]} />);

    fireEvent.click(screen.getByRole("button", { name: "Iniciar onboarding" }));

    await waitFor(() => expect(promoteProspect).toHaveBeenCalledWith(1));
    expect(mocks.push).toHaveBeenCalledWith("/admin/crawler/agencies/42");
  });
});
