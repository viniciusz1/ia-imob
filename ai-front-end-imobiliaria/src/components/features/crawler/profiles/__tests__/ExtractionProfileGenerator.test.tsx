import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getCrawlerOperation, queueExtractionProfileGeneration } from "@/services/crawlerService";
import type { CrawlerOperation, DiscoverySnapshot, MarketDataContract } from "@/types/crawler";

import { ExtractionProfileGenerator } from "../ExtractionProfileGenerator";

vi.mock("@/services/crawlerService", () => ({
  getCrawlerOperation: vi.fn(),
  queueExtractionProfileGeneration: vi.fn(),
  queueSampleUrlSuggestion: vi.fn(),
}));

const contract: MarketDataContract = {
  id: 1,
  version: 1,
  status: "active",
  fields: [],
  compatibility: "additive_optional",
  affected_agencies: [],
  created_by: 1,
  activated_by: 1,
  activated_at: "2026-07-15T12:00:00Z",
  created_at: "2026-07-15T12:00:00Z",
};

const snapshot: DiscoverySnapshot = {
  id: 5,
  crawl_agency_id: 42,
  operation_id: 7,
  url_count: 10,
  content_hash: "abc",
  created_at: "2026-07-15T12:00:00Z",
};

function operation(overrides: Partial<CrawlerOperation> = {}): CrawlerOperation {
  return {
    id: 91,
    type: "profile_generation",
    state: "running",
    crawl_agency_id: 42,
    market_data_contract_version_id: 1,
    retry_of_operation_id: null,
    equivalence_key: "profile-42",
    plan: { crawl_agency_id: 42 },
    progress: { stage: "profile_generation", percentage: 40, processed: 2, total: 5, message: "Gerando schemas", heartbeat_at: null },
    result: null,
    error: null,
    discovery_snapshot_id: null,
    created_at: "2026-07-15T12:00:00Z",
    completed_at: null,
    ...overrides,
  };
}

describe("ExtractionProfileGenerator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => vi.useRealTimers());

  it("shows visible labels and requires a valid confirmed sample URL", () => {
    render(<ExtractionProfileGenerator agencyId={42} contracts={[contract]} snapshots={[snapshot]} />);

    expect(screen.getByLabelText("Snapshot de Discovery")).toBeInTheDocument();
    expect(screen.getByLabelText("Contrato de Dados de Mercado")).toBeInTheDocument();
    expect(screen.getByText(/conjunto imutável de urls/i)).toBeInTheDocument();
    expect(screen.getByText(/campos canônicos/i)).toBeInTheDocument();
    const sampleUrl = screen.getByLabelText("URL de amostra");
    fireEvent.change(sampleUrl, { target: { value: "não é uma url" } });
    fireEvent.click(screen.getByRole("checkbox", { name: /confirmo a url/i }));

    expect(screen.getByText(/informe uma url http ou https válida/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /gerar perfil candidato/i })).toBeDisabled();
  });

  it("invalidates URL confirmation whenever the sample is edited", () => {
    render(<ExtractionProfileGenerator agencyId={42} contracts={[contract]} snapshots={[snapshot]} />);
    const sampleUrl = screen.getByLabelText("URL de amostra");
    const confirmation = screen.getByRole("checkbox", { name: /confirmo a url/i });

    fireEvent.change(sampleUrl, { target: { value: "https://agency.example.com/imovel/1" } });
    fireEvent.click(confirmation);
    expect(confirmation).toBeChecked();

    fireEvent.change(sampleUrl, { target: { value: "https://agency.example.com/imovel/2" } });
    expect(confirmation).not.toBeChecked();
  });

  it("explains a missing Discovery and links to the prerequisite", () => {
    render(<ExtractionProfileGenerator agencyId={42} contracts={[contract]} snapshots={[]} />);

    expect(screen.getByText(/crie um snapshot de discovery/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /criar discovery/i })).toHaveAttribute("href", "/admin/crawler/agencies/42/discoveries");
  });

  it("explains a missing active contract and links to its administration", () => {
    render(<ExtractionProfileGenerator agencyId={42} contracts={[{ ...contract, status: "draft" }]} snapshots={[snapshot]} />);

    expect(screen.getByText(/ative um contrato de dados de mercado/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /administrar contratos/i })).toHaveAttribute("href", "/admin/crawler/settings");
  });

  it("recovers an active generation operation and prevents a duplicate", () => {
    render(
      <ExtractionProfileGenerator
        agencyId={42}
        contracts={[contract]}
        initialOperations={[operation()]}
        snapshots={[snapshot]}
      />,
    );

    expect(screen.getByText(/operação #91/i)).toBeInTheDocument();
    expect(screen.getByText(/gerando schemas/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /abrir na fila global/i })).toHaveAttribute("href", "/admin/crawler/operations?crawl_agency_id=42");
    expect(screen.getByRole("button", { name: /gerar perfil candidato/i })).toBeDisabled();
    expect(screen.getByText(/já existe uma geração em andamento/i)).toBeInTheDocument();
  });

  it("surfaces a newly queued generation operation", async () => {
    vi.mocked(queueExtractionProfileGeneration).mockResolvedValue(operation({ state: "queued", progress: { stage: "queued", percentage: 0, processed: 0, total: null, message: "Aguardando worker", heartbeat_at: null } }));
    render(
      <ExtractionProfileGenerator
        agencyId={42}
        contracts={[contract]}
        initialSampleUrl="https://agency.example.com/imovel/1"
        snapshots={[snapshot]}
      />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: /confirmo a url/i }));
    fireEvent.click(screen.getByRole("button", { name: /gerar perfil candidato/i }));

    await waitFor(() => expect(queueExtractionProfileGeneration).toHaveBeenCalledOnce());
    expect(await screen.findByText(/operação #91/i)).toBeInTheDocument();
  });

  it.each([
    ["failed", "Falhou", "Não foi possível gerar os schemas"],
    ["cancelled", "Cancelada", null],
  ] as const)("recovers a %s generation after reloading", (state, label, message) => {
    render(
      <ExtractionProfileGenerator
        agencyId={42}
        contracts={[contract]}
        initialOperations={[operation({ state, error: message ? { code: "generation_failed", message } : null })]}
        snapshots={[snapshot]}
      />,
    );

    expect(screen.getByText(label)).toBeInTheDocument();
    if (message) expect(screen.getByText(message)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /abrir na fila global/i })).toBeInTheDocument();
  });

  it("refreshes the version history when generation succeeds", async () => {
    vi.useFakeTimers();
    const onProfilesChanged = vi.fn();
    vi.mocked(getCrawlerOperation).mockResolvedValue(operation({
      state: "succeeded",
      progress: { stage: "completed", percentage: 100, processed: 5, total: 5, message: "Perfil gerado", heartbeat_at: null },
      result: { extraction_profile_id: 12 },
    }));
    render(<ExtractionProfileGenerator agencyId={42} contracts={[contract]} initialOperations={[operation()]} onProfilesChanged={onProfilesChanged} snapshots={[snapshot]} />);

    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(onProfilesChanged).toHaveBeenCalledOnce();
    expect(screen.getByText("Concluída")).toBeInTheDocument();
  });

  it("fills a successful URL suggestion and requires a new confirmation", async () => {
    vi.useFakeTimers();
    const suggestion = operation({ type: "sample_url_suggestion", equivalence_key: "suggestion-42" });
    vi.mocked(getCrawlerOperation).mockResolvedValue({
      ...suggestion,
      state: "succeeded",
      progress: { ...suggestion.progress, percentage: 100 },
      result: { sample_url: "https://agency.example.com/imovel/sugerido" },
    });
    render(<ExtractionProfileGenerator agencyId={42} contracts={[contract]} initialOperations={[suggestion]} initialSampleUrl="https://agency.example.com/antigo" snapshots={[snapshot]} />);
    fireEvent.click(screen.getByRole("checkbox", { name: /confirmo a url/i }));

    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(screen.getByLabelText("URL de amostra")).toHaveValue("https://agency.example.com/imovel/sugerido");
    expect(screen.getByRole("checkbox", { name: /confirmo a url/i })).not.toBeChecked();
  });
});
