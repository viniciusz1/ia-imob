import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { transitionCrawlAgency } from "@/services/crawlerService";
import { useAuthStore } from "@/store/useAuthStore";
import type { CrawlAgency } from "@/types/crawler";
import { CrawlAgencyLifecycleSettings } from "../CrawlAgencyLifecycleSettings";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock("@/services/crawlerService", () => ({
  transitionCrawlAgency: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const baseAgency: CrawlAgency = {
  id: 65,
  name: "JLN Jorge Luiz Nikelatti",
  slug: "jln-jorge-luiz-nikelatti-64",
  base_url: "http://corretordeimoveis-jln.com.br/",
  root_domain: "corretordeimoveis-jln.com.br",
  lifecycle_state: "onboarding",
  health_state: "unknown",
  revalidation_required: false,
  active_discovery_policy_version_id: null,
  active_discovery_policy: null,
  current_published_crawl_run_id: null,
  created_at: "2026-08-01T00:00:00Z",
  updated_at: "2026-08-01T00:00:00Z",
};

describe("CrawlAgencyLifecycleSettings", () => {
  beforeEach(() => {
    refresh.mockReset();
    vi.mocked(transitionCrawlAgency).mockReset();
    useAuthStore.getState().setUser({
      id: 1,
      name: "Platform Operator",
      email: "operator@example.com",
      is_platform_admin: true,
      permissions: ["crawler.agencies.manage", "crawler.agencies.activate"],
    });
  });

  it("renders onboarding state and allows activating and archiving", async () => {
    vi.mocked(transitionCrawlAgency).mockResolvedValue({
      ...baseAgency,
      lifecycle_state: "active",
    });

    render(<CrawlAgencyLifecycleSettings agency={baseAgency} />);

    expect(screen.getByText("Onboarding")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ativar Crawl Agency" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Arquivar imobiliária" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ativar Crawl Agency" }));

    await waitFor(() => {
      expect(transitionCrawlAgency).toHaveBeenCalledWith(65, "active");
    });
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("opens confirmation dialog before archiving an onboarding agency", async () => {
    vi.mocked(transitionCrawlAgency).mockResolvedValue({
      ...baseAgency,
      lifecycle_state: "archived",
    });

    render(<CrawlAgencyLifecycleSettings agency={baseAgency} />);

    fireEvent.click(screen.getByRole("button", { name: "Arquivar imobiliária" }));

    expect(screen.getByText(/Arquivar a Crawl Agency JLN Jorge Luiz Nikelatti/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Confirmar e arquivar" }));

    await waitFor(() => {
      expect(transitionCrawlAgency).toHaveBeenCalledWith(65, "archived");
    });
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("warns that properties will be hidden when archiving an active agency", async () => {
    const activeAgency: CrawlAgency = {
      ...baseAgency,
      lifecycle_state: "active",
    };

    vi.mocked(transitionCrawlAgency).mockResolvedValue({
      ...activeAgency,
      lifecycle_state: "archived",
    });

    render(<CrawlAgencyLifecycleSettings agency={activeAgency} />);

    expect(screen.getByText("Ativa")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pausar coletas" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Arquivar imobiliária" }));

    expect(
      screen.getByText(/Ao arquivar a imobiliária, todos os seus imóveis deixarão imediatamente de ser exibidos/i)
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Confirmar e arquivar" }));

    await waitFor(() => {
      expect(transitionCrawlAgency).toHaveBeenCalledWith(65, "archived");
    });
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("allows reactivating an archived agency", async () => {
    const archivedAgency: CrawlAgency = {
      ...baseAgency,
      lifecycle_state: "archived",
    };

    vi.mocked(transitionCrawlAgency).mockResolvedValue({
      ...archivedAgency,
      lifecycle_state: "active",
    });

    render(<CrawlAgencyLifecycleSettings agency={archivedAgency} />);

    expect(screen.getByText("Arquivada")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reativar imobiliária" }));

    expect(screen.getByText(/Reativar a imobiliária JLN Jorge Luiz Nikelatti/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Confirmar reativação" }));

    await waitFor(() => {
      expect(transitionCrawlAgency).toHaveBeenCalledWith(65, "active");
    });
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("renders permission warning when user lacks permissions", () => {
    useAuthStore.getState().setUser({
      id: 2,
      name: "Viewer",
      email: "viewer@example.com",
      is_platform_admin: false,
      permissions: ["crawler.view"],
    });

    render(<CrawlAgencyLifecycleSettings agency={baseAgency} />);

    expect(screen.queryByRole("button", { name: "Ativar Crawl Agency" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Arquivar imobiliária" })).not.toBeInTheDocument();
    expect(screen.getByText(/Você não possui permissão para alterar o ciclo de vida/i)).toBeInTheDocument();
  });
});
