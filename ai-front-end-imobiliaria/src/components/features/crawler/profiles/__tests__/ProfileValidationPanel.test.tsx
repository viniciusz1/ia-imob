import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { decideExtractionProfile, getCrawlerOperation, getProfileValidationReport } from "@/services/crawlerService";
import type { CrawlerOperation, ExtractionProfile } from "@/types/crawler";

import { ProfileValidationPanel } from "../ProfileValidationPanel";

vi.mock("@/services/crawlerService", () => ({
  activateCrawlAgency: vi.fn(),
  activateExtractionProfile: vi.fn(),
  decideExtractionProfile: vi.fn(),
  getCrawlerOperation: vi.fn(),
  getProfileValidationReport: vi.fn(),
  getProfileValidationRecords: vi.fn(),
  queueProfileValidation: vi.fn(),
}));

const profile: ExtractionProfile = {
  id: 9,
  crawl_agency_id: 42,
  discovery_snapshot_id: 5,
  market_data_contract_version_id: 1,
  version: 1,
  status: "candidate",
  sample_url: "https://agency.example.com/property/1",
  schemas: { xpath: { title: "//h1" } },
  strategies: ["xpath"],
  fields: [{ name: "title", type: "string", required: true, normalization: ["trim"] }],
  parameters: { timeout_seconds: 10 },
  decided_by: null,
  decided_at: null,
  decision_reason: null,
  activated_by: null,
  activated_at: null,
  created_at: "2026-07-15T12:00:00Z",
  latest_validation_report: {
    id: 4,
    operation_id: 11,
    extraction_profile_id: 9,
    sampled_url_count: 20,
    valid_record_count: 0,
    valid_ratio: 0,
    required_field_coverage: { title: 1 },
    blocking_failures: ["no_valid_records"],
    warnings: ["One normalization warning"],
    eligible: false,
    created_at: "2026-07-15T12:30:00Z",
  },
};

function operation(overrides: Partial<CrawlerOperation> = {}): CrawlerOperation {
  return {
    id: 55,
    type: "profile_validation",
    state: "running",
    crawl_agency_id: 42,
    market_data_contract_version_id: 1,
    retry_of_operation_id: null,
    equivalence_key: "validation-9",
    plan: { extraction_profile_id: 9 },
    progress: { stage: "profile_validation", percentage: 35, processed: 7, total: 20, message: "Validando URLs", heartbeat_at: null },
    result: null,
    error: null,
    discovery_snapshot_id: null,
    created_at: "2026-07-15T12:35:00Z",
    completed_at: null,
    ...overrides,
  };
}

describe("ProfileValidationPanel", () => {
  beforeEach(() => vi.resetAllMocks());
  afterEach(() => vi.useRealTimers());

  it("starts as a compact localized version summary", () => {
    render(<ProfileValidationPanel agencyLifecycle="onboarding" initialProfile={profile} />);

    expect(screen.getByText("Perfil v1")).toBeInTheDocument();
    expect(screen.getByText("Candidato")).toBeInTheDocument();
    expect(screen.queryByText("Snapshot de Discovery")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /ver detalhes do perfil v1/i }));
    expect(screen.getByText("Snapshot de Discovery")).toBeInTheDocument();
    expect(screen.getByText("#5")).toBeInTheDocument();
    expect(screen.getByText(/título \(title\) · string · obrigatório · trim/i)).toBeInTheDocument();
    expect(screen.getByText(/seletores xpath \(xpath\)/i)).toBeInTheDocument();
    expect(screen.getByText("candidate")).toBeInTheDocument();
  });

  it("presents critical validation failures without blocking justified approval", () => {
    render(<ProfileValidationPanel agencyLifecycle="onboarding" initialProfile={profile} />);
    fireEvent.click(screen.getByRole("button", { name: /ver detalhes do perfil v1/i }));

    expect(screen.getByText(/falhas críticas de validação/i)).toBeInTheDocument();
    expect(screen.queryByText(/falha bloqueante/i)).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: /motivo da decisão/i }), { target: { value: "Evidências revisadas" } });
    expect(screen.getByRole("button", { name: /aprovar perfil/i })).toBeEnabled();
  });

  it("keeps decision controls hidden when another version owns the primary action", () => {
    render(<ProfileValidationPanel agencyLifecycle="onboarding" allowDecision={false} initialProfile={profile} />);
    fireEvent.click(screen.getByRole("button", { name: /ver detalhes do perfil v1/i }));

    expect(screen.queryByRole("button", { name: /aprovar perfil/i })).not.toBeInTheDocument();
    expect(screen.getByText(/resultado da validação/i)).toBeInTheDocument();
  });

  it("recovers an active validation operation and prevents a duplicate", () => {
    render(<ProfileValidationPanel agencyLifecycle="onboarding" initialOperations={[operation()]} initialProfile={{ ...profile, latest_validation_report: null }} />);

    expect(screen.getByText(/operação #55/i)).toBeInTheDocument();
    expect(screen.getByText(/validando urls/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /validação em andamento/i })).toBeDisabled();
  });

  it.each([
    ["failed", "Falhou", "A coleta de amostra falhou"],
    ["cancelled", "Cancelada", null],
  ] as const)("recovers a %s validation after reloading", (state, label, message) => {
    render(
      <ProfileValidationPanel
        agencyLifecycle="onboarding"
        initialOperations={[operation({ state, error: message ? { code: "validation_failed", message } : null })]}
        initialProfile={{ ...profile, latest_validation_report: null }}
      />,
    );

    expect(screen.getByText(label)).toBeInTheDocument();
    if (message) expect(screen.getByText(message)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /abrir na fila global/i })).toBeInTheDocument();
  });

  it("shows the completed validation report without a page reload", async () => {
    vi.useFakeTimers();
    const completed = operation({
      state: "succeeded",
      progress: { stage: "completed", percentage: 100, processed: 20, total: 20, message: "Validação concluída", heartbeat_at: null },
      result: { profile_validation_report_id: 4 },
    });
    vi.mocked(getCrawlerOperation).mockResolvedValue(completed);
    vi.mocked(getProfileValidationReport).mockResolvedValue(profile.latest_validation_report!);
    render(<ProfileValidationPanel agencyLifecycle="onboarding" initialOperations={[operation()]} initialProfile={{ ...profile, latest_validation_report: null }} />);

    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(screen.getByText(/última validação/i)).toBeInTheDocument();
    expect(screen.getByText("Concluída")).toBeInTheDocument();
  });

  it("disables decision controls while the request is pending", async () => {
    let resolveDecision: ((value: ExtractionProfile) => void) | undefined;
    vi.mocked(decideExtractionProfile).mockReturnValue(new Promise((resolve) => { resolveDecision = resolve; }));
    render(<ProfileValidationPanel agencyLifecycle="onboarding" initialProfile={profile} />);
    fireEvent.click(screen.getByRole("button", { name: /ver detalhes do perfil v1/i }));
    fireEvent.change(screen.getByRole("textbox", { name: /motivo da decisão/i }), { target: { value: "Evidências revisadas" } });
    fireEvent.click(screen.getByRole("button", { name: /aprovar perfil/i }));

    expect(screen.getByRole("button", { name: /aprovando/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /rejeitar perfil/i })).toBeDisabled();

    resolveDecision?.({ ...profile, status: "approved" });
    await waitFor(() => expect(screen.queryByRole("button", { name: /aprovando/i })).not.toBeInTheDocument());
  });

  it("keeps a failed decision associated with its controls", async () => {
    vi.mocked(decideExtractionProfile).mockRejectedValue(new Error("network"));
    render(<ProfileValidationPanel agencyLifecycle="onboarding" initialProfile={profile} />);
    fireEvent.click(screen.getByRole("button", { name: /ver detalhes do perfil v1/i }));
    fireEvent.change(screen.getByRole("textbox", { name: /motivo da decisão/i }), { target: { value: "Evidências revisadas" } });
    fireEvent.click(screen.getByRole("button", { name: /rejeitar perfil/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/não foi possível registrar a decisão/i);
    expect(screen.getByRole("button", { name: /rejeitar perfil/i })).toBeEnabled();
  });

  it("shows decision and activation actors as an auditable summary", () => {
    render(<ProfileValidationPanel agencyLifecycle="active" initialProfile={{
      ...profile,
      status: "active",
      decided_by: 2,
      decider: { id: 2, name: "Ana Revisora" },
      decided_at: "2026-07-16T12:00:00Z",
      decision_reason: "Evidências revisadas manualmente.",
      activated_by: 3,
      activator: { id: 3, name: "Bruno Operador" },
      activated_at: "2026-07-16T13:00:00Z",
    }} />);

    fireEvent.click(screen.getByRole("button", { name: /ver detalhes do perfil v1/i }));
    expect(screen.getByText(/ana revisora/i)).toBeInTheDocument();
    expect(screen.getByText(/evidências revisadas manualmente/i)).toBeInTheDocument();
    expect(screen.getByText(/bruno operador/i)).toBeInTheDocument();
  });
});
