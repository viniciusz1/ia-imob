import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { activateCrawlAgencyDiscoveryPolicy, queueProductionCrawl } from "@/services/crawlerService";
import { useAuthStore } from "@/store/useAuthStore";
import type { CrawlAgency, DiscoveryPolicyVersion } from "@/types/crawler";

import { ProductionCrawlPanel } from "../ProductionCrawlPanel";

vi.mock("@/services/crawlerService", () => ({
  activateCrawlAgencyDiscoveryPolicy: vi.fn(),
  queueProductionCrawl: vi.fn(),
}));

const mockedQueue = vi.mocked(queueProductionCrawl);
const mockedActivate = vi.mocked(activateCrawlAgencyDiscoveryPolicy);

const activePolicy: DiscoveryPolicyVersion = {
  id: 21,
  policy_key: "active-policy",
  name: "Discovery ativo",
  version: 2,
  status: "available",
  strategies: ["sitemap", "homepage"],
  configuration: { max_urls: 500 },
  mutable: false,
  model_reference_count: 0,
  active_model_reference_count: 0,
  created_by: 1,
  created_at: "2026-07-15T12:00:00Z",
};

const overridePolicy: DiscoveryPolicyVersion = {
  ...activePolicy,
  id: 22,
  policy_key: "override-policy",
  name: "Discovery diagnóstico",
  version: 1,
  strategies: ["homepage", "robots"],
};

const agency: CrawlAgency = {
  id: 42,
  name: "Imóveis Litoral",
  slug: "imoveis-litoral",
  base_url: "https://litoral.example.com",
  root_domain: "litoral.example.com",
  lifecycle_state: "active",
  health_state: "healthy",
  revalidation_required: false,
  current_published_crawl_run_id: 1,
  active_discovery_policy_version_id: activePolicy.id,
  active_discovery_policy: {
    id: activePolicy.id,
    name: activePolicy.name,
    version: activePolicy.version,
    source: "agency_active",
    strategies: activePolicy.strategies,
    configuration: activePolicy.configuration,
  },
  created_at: "2026-07-15T12:00:00Z",
  updated_at: "2026-07-15T12:00:00Z",
};

describe("ProductionCrawlPanel", () => {
  beforeEach(() => {
    useAuthStore.getState().setUser({
      id: 1,
      name: "Crawler Operator",
      email: "crawler@example.com",
      is_platform_admin: true,
      permissions: ["crawler.view", "crawler.operations.execute", "crawler.policies.manage"],
    });
    mockedQueue.mockResolvedValue({
      id: 12,
      type: "production_crawl",
      state: "queued",
      crawl_agency_id: 42,
      market_data_contract_version_id: 1,
      retry_of_operation_id: null,
      equivalence_key: null,
      plan: {},
      progress: { stage: "queued", percentage: 0, processed: 0, total: null, message: null, heartbeat_at: null },
      result: null,
      error: null,
      discovery_snapshot_id: null,
      created_at: "2026-07-15T12:00:00Z",
      completed_at: null,
    });
    mockedActivate.mockResolvedValue({
      ...agency,
      active_discovery_policy_version_id: 23,
      active_discovery_policy: {
        id: 23,
        name: overridePolicy.name,
        version: 2,
        source: "agency_active",
        strategies: overridePolicy.strategies,
        configuration: overridePolicy.configuration,
      },
    });
  });

  it("defaults to fresh discovery and lets the operator pin a historical discovery and approved profile", async () => {
    render(
      <ProductionCrawlPanel
        agency={agency}
        discoveryPolicies={[activePolicy, overridePolicy]}
        profiles={[
          { id: 7, version: 1, status: "active", sample_url: "https://example.com/1" },
          { id: 8, version: 2, status: "approved", sample_url: "https://example.com/2" },
        ]}
        snapshots={[{ id: 5, url_count: 30, created_at: "2026-07-15T12:00:00Z" }]}
      />,
    );

    expect(screen.getByRole("combobox", { name: /discovery do crawl/i })).toHaveValue("fresh");
    expect(screen.getByLabelText("Política para esta operação")).toHaveValue("21");
    expect(screen.getByText("Política de Discovery Ativa").parentElement).toHaveTextContent("Discovery ativo · v2");
    fireEvent.change(screen.getByRole("combobox", { name: /discovery do crawl/i }), { target: { value: "5" } });
    fireEvent.change(screen.getByRole("combobox", { name: /perfil de extração/i }), { target: { value: "8" } });
    fireEvent.click(screen.getByRole("button", { name: /rodar crawl/i }));

    await waitFor(() => expect(mockedQueue).toHaveBeenCalledWith({
      crawl_agency_id: 42,
      discovery_mode: "existing",
      discovery_snapshot_id: 5,
      extraction_profile_id: 8,
    }));
  });

  it("allows an existing snapshot without an active discovery policy", async () => {
    render(
      <ProductionCrawlPanel
        agency={{
          ...agency,
          active_discovery_policy_version_id: null,
          active_discovery_policy: null,
        }}
        discoveryPolicies={[]}
        profiles={[{ id: 8, version: 1, status: "approved", sample_url: "https://example.com/1" }]}
        snapshots={[{ id: 33, url_count: 500, created_at: "2026-07-15T12:00:00Z" }]}
      />,
    );

    fireEvent.change(screen.getByRole("combobox", { name: /discovery do crawl/i }), {
      target: { value: "33" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Rodar Crawl" }));

    await waitFor(() => expect(mockedQueue).toHaveBeenCalledWith({
      crawl_agency_id: 42,
      discovery_mode: "existing",
      discovery_snapshot_id: 33,
      extraction_profile_id: 8,
    }));
  });

  it("can limit a historical snapshot crawl to URLs not imported yet", async () => {
    render(
      <ProductionCrawlPanel
        agency={agency}
        discoveryPolicies={[activePolicy]}
        profiles={[{ id: 7, version: 1, status: "active", sample_url: "https://example.com/1" }]}
        snapshots={[{ id: 5, url_count: 30, created_at: "2026-07-15T12:00:00Z" }]}
      />,
    );

    fireEvent.change(screen.getByRole("combobox", { name: /discovery do crawl/i }), { target: { value: "5" } });
    fireEvent.click(screen.getByLabelText(/somente urls ainda não importadas/i));
    fireEvent.click(screen.getByRole("button", { name: /rodar crawl/i }));

    await waitFor(() => expect(mockedQueue).toHaveBeenCalledWith({
      crawl_agency_id: 42,
      discovery_mode: "existing",
      discovery_snapshot_id: 5,
      extraction_profile_id: 7,
      only_new_urls: true,
    }));
  });

  it("keeps an override operation-only and requires explicit confirmation to create a new active version", async () => {
    render(
      <ProductionCrawlPanel
        agency={agency}
        discoveryPolicies={[activePolicy, overridePolicy]}
        profiles={[{ id: 7, version: 1, status: "active", sample_url: "https://example.com/1" }]}
        snapshots={[]}
      />,
    );

    fireEvent.change(screen.getByLabelText("Política para esta operação"), { target: { value: "22" } });
    expect(screen.getByText(/Override pontual/)).toHaveTextContent("não altera o agendamento");
    fireEvent.click(screen.getByRole("button", { name: "Rodar Crawl" }));

    await waitFor(() => expect(mockedQueue).toHaveBeenCalledWith({
      crawl_agency_id: 42,
      discovery_mode: "fresh",
      discovery_policy_version_id: 22,
      extraction_profile_id: 7,
    }));
    expect(mockedActivate).not.toHaveBeenCalled();

    expect(screen.getByRole("button", { name: "Salvar como nova política ativa" })).toBeDisabled();
    fireEvent.click(screen.getByLabelText(/Confirmo a criação e ativação/));
    fireEvent.click(screen.getByRole("button", { name: "Salvar como nova política ativa" }));

    await waitFor(() => expect(mockedActivate).toHaveBeenCalledWith(42, 22));
    expect(screen.getByText("Política de Discovery Ativa").parentElement).toHaveTextContent("Discovery diagnóstico · v2");
  });

  it("does not expose crawl mutations to a read-only operator", () => {
    useAuthStore.getState().setUser({
      id: 2,
      name: "Viewer",
      email: "viewer@example.com",
      is_platform_admin: true,
      permissions: ["crawler.view"],
    });

    render(
      <ProductionCrawlPanel
        agency={agency}
        discoveryPolicies={[activePolicy, overridePolicy]}
        profiles={[{ id: 7, version: 1, status: "active", sample_url: "https://example.com/1" }]}
        snapshots={[]}
      />,
    );

    expect(screen.queryByRole("button", { name: "Rodar Crawl" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Política para esta operação")).toBeDisabled();
  });

  it("explains quality prerequisites and blocks a new production", () => {
    render(
      <ProductionCrawlPanel
        agency={agency}
        discoveryPolicies={[activePolicy]}
        hasActiveQualityPolicy={false}
        pendingCandidateRunId={33}
        profiles={[{ id: 7, version: 1, status: "active", sample_url: "https://example.com/1" }]}
        snapshots={[]}
      />,
    );

    expect(screen.getByText("Nenhuma Política de Qualidade ativa")).toBeInTheDocument();
    expect(screen.getByText(/Snapshot Candidato aguardando Qualidade/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Resolver em Qualidade" })).toHaveAttribute("href", "/admin/crawler/agencies/42/quality");
    expect(screen.getByRole("button", { name: "Rodar Crawl" })).toBeDisabled();
  });
});
