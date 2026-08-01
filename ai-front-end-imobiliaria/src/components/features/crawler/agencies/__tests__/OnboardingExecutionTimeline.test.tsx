import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  approveOnboardingExecution,
  getOnboardingExecution,
  retryCrawlerOperation,
  saveOnboardingPointConfiguration,
  startOnboardingFirstProduction,
} from "@/services/crawlerService";
import { useAuthStore } from "@/store/useAuthStore";
import type { OnboardingExecution } from "@/types/crawler";

import { OnboardingExecutionTimeline } from "../OnboardingExecutionTimeline";

vi.mock("@/services/crawlerService", () => ({
  actOnboardingExecution: vi.fn(),
  approveOnboardingExecution: vi.fn(),
  getOnboardingExecution: vi.fn(),
  retryCrawlerOperation: vi.fn(),
  saveOnboardingPointConfiguration: vi.fn(),
  startOnboardingFirstProduction: vi.fn(),
}));

function execution(overrides: Partial<OnboardingExecution> = {}): OnboardingExecution {
  return {
    id: 91,
    onboarding_plan_id: 14,
    crawl_agency_id: 42,
    name: "Litoral automatizado",
    conduction: "automated",
    state: "awaiting_approval",
    current_step: "approval",
    execution_model_version_id: 13,
    discovery_policy_version_id: 11,
    extraction_policy_version_id: 12,
    discovery_snapshot_id: 21,
    market_data_contract_version_id: 1,
    extraction_profile_id: 31,
    profile_validation_report_id: 41,
    first_production_discovery_mode: "fresh",
    first_production_crawl_run_id: null,
    resolved_configuration: {
      version: 1,
      execution_model: { id: 13, name: "Modelo", version: 1 },
      discovery: { mode: "fresh" },
      discovery_policy: { id: 11, name: "Discovery", version: 1, source: "catalog", strategies: ["sitemap"], configuration: {} },
      extraction_policy: { id: 12, name: "Extração", version: 1, source: "catalog", strategies: ["xpath"], configuration: {} },
      market_data_contract: { id: 1, version: 1, fields: [] },
    },
    sample_url: "https://litoral.example.com/imovel/1",
    sample_url_selection: { confirmed: true },
    attention: null,
    approval: null,
    first_production: null,
    steps: [
      { key: "discovery", state: "completed", operation_id: 101, attempt: 1 },
      { key: "profile_generation", state: "completed", operation_id: 102, attempt: 1 },
      { key: "profile_validation", state: "completed", operation_id: 103, attempt: 1 },
      { key: "approval", state: "awaiting_approval", operation_id: null, attempt: null },
      { key: "first_production", state: "pending", operation_id: null, attempt: null },
      { key: "quality_gate", state: "pending", operation_id: null, attempt: null },
    ],
    operations: [{
      id: 101,
      type: "discovery",
      state: "succeeded",
      step: "discovery",
      attempt: 1,
      retry_of_operation_id: null,
      progress: { stage: "discovery", percentage: 100, message: "Concluído" },
      result: { discovery_snapshot_id: 21 },
      error: null,
      created_at: "2026-07-27T12:00:00Z",
      completed_at: "2026-07-27T12:01:00Z",
    }],
    recovery_actions: [],
    next_action: "decide_onboarding",
    started_at: "2026-07-27T12:00:00Z",
    paused_at: "2026-07-27T12:10:00Z",
    completed_at: null,
    created_at: "2026-07-27T12:00:00Z",
    updated_at: "2026-07-27T12:10:00Z",
    ...overrides,
  };
}

describe("OnboardingExecutionTimeline", () => {
  beforeEach(() => {
    useAuthStore.getState().setUser({
      id: 1,
      name: "Approver",
      email: "approver@example.com",
      is_platform_admin: true,
      permissions: [
        "crawler.view",
        "crawler.operations.execute",
        "crawler.policies.manage",
        "crawler.profiles.approve",
        "crawler.agencies.activate",
      ],
    });
  });

  it("shows attempts and stops clearly for explicit approval", async () => {
    const current = execution();
    const approved = execution({
      state: "running",
      current_step: "first_production",
      approval: { approved_by: 1, approved_at: "2026-07-27T12:11:00Z", reason: "Amostra revisada" },
      next_action: "wait_for_current_operation",
    });
    vi.mocked(approveOnboardingExecution).mockResolvedValue(approved);
    const onExecution = vi.fn();

    render(<OnboardingExecutionTimeline execution={current} history={[current]} onExecution={onExecution} />);

    expect(screen.getByText(/nenhuma produção foi iniciada/i)).toBeInTheDocument();
    expect(screen.getByText("Tentativa 1 · Operação #101")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Abrir fila global" })).toHaveAttribute("href", "/admin/crawler/operations");
    expect(screen.getByRole("link", { name: "Ver detalhes da operação" })).toHaveAttribute("href", expect.stringContaining("#operation-101"));

    fireEvent.change(screen.getByLabelText("Justificativa da aprovação"), { target: { value: "Amostra revisada" } });
    fireEvent.click(screen.getByRole("button", { name: "Aprovar e continuar" }));

    await waitFor(() => expect(approveOnboardingExecution).toHaveBeenCalledWith(91, "Amostra revisada"));
    expect(onExecution).toHaveBeenCalledWith(approved);
  });

  it("offers exactly the linked retry when a child operation fails", async () => {
    const failed = execution({
      state: "requires_attention",
      current_step: "discovery",
      attention: { code: "child_operation_failed", category: "unknown", message: "O Discovery falhou." },
      recovery_actions: [{
        key: "retry_failed_operation",
        priority: "primary",
        enabled: true,
        reason: "A retentativa preserva as entradas e a tentativa original.",
      }],
      next_action: "retry_failed_operation",
      steps: [
        { key: "discovery", state: "requires_attention", operation_id: 101, attempt: 1 },
        { key: "profile_generation", state: "pending", operation_id: null, attempt: null },
        { key: "profile_validation", state: "pending", operation_id: null, attempt: null },
        { key: "approval", state: "pending", operation_id: null, attempt: null },
        { key: "first_production", state: "pending", operation_id: null, attempt: null },
        { key: "quality_gate", state: "pending", operation_id: null, attempt: null },
      ],
      operations: [{
        id: 101,
        type: "discovery",
        state: "failed",
        step: "discovery",
        attempt: 1,
        retry_of_operation_id: null,
        progress: { stage: "discovery", percentage: 35, message: "Falha" },
        result: null,
        error: { code: "adapter_failed", message: "Timeout" },
        created_at: "2026-07-27T12:00:00Z",
        completed_at: "2026-07-27T12:01:00Z",
      }],
    });
    const resumed = execution({ state: "running", current_step: "discovery", next_action: "wait_for_current_operation" });
    vi.mocked(retryCrawlerOperation).mockResolvedValue({
      id: 102,
      type: "discovery",
      state: "queued",
      crawl_agency_id: 42,
      market_data_contract_version_id: 1,
      retry_of_operation_id: 101,
      equivalence_key: null,
      plan: {},
      progress: { stage: "queue", percentage: 0, processed: 0, total: null, message: null, heartbeat_at: null },
      result: null,
      error: null,
      discovery_snapshot_id: null,
      created_at: "2026-07-27T12:02:00Z",
      completed_at: null,
    });
    vi.mocked(getOnboardingExecution).mockResolvedValue(resumed);
    const onExecution = vi.fn();

    render(<OnboardingExecutionTimeline execution={failed} history={[failed]} onExecution={onExecution} />);

    expect(screen.getByText("O Discovery falhou.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retentar etapa com falha" }));

    await waitFor(() => expect(retryCrawlerOperation).toHaveBeenCalledWith(101));
    expect(getOnboardingExecution).toHaveBeenCalledWith(91);
    expect(onExecution).toHaveBeenCalledWith(resumed);
  });

  it("prioritizes reviewing a fixed configuration while keeping retry available", () => {
    const failed = execution({
      state: "requires_attention",
      current_step: "discovery",
      attention: {
        code: "child_operation_failed",
        category: "configuration",
        message: "A configuração de Discovery usa uma fonte sem suporte do worker. Revise a configuração antes de tentar novamente.",
      },
      recovery_actions: [
        {
          key: "review_configuration",
          priority: "primary",
          enabled: true,
          reason: "A mesma configuração tende a repetir esta falha.",
        },
        {
          key: "retry_failed_operation",
          priority: "secondary",
          enabled: true,
          reason: "Retente sem alterar as entradas somente depois de corrigir ou atualizar o worker.",
        },
      ],
      next_action: "review_configuration",
      resolved_configuration: {
        ...execution().resolved_configuration,
        discovery_policy: {
          id: 11,
          name: "Discovery incompatível",
          version: 1,
          source: "catalog",
          strategies: ["contract_discoverer_abc", "sitemap"],
          configuration: { max_urls: 100 },
        },
      },
      steps: [
        { key: "discovery", state: "requires_attention", operation_id: 101, attempt: 1 },
        { key: "profile_generation", state: "pending", operation_id: null, attempt: null },
        { key: "profile_validation", state: "pending", operation_id: null, attempt: null },
        { key: "approval", state: "pending", operation_id: null, attempt: null },
        { key: "first_production", state: "pending", operation_id: null, attempt: null },
        { key: "quality_gate", state: "pending", operation_id: null, attempt: null },
      ],
      operations: [{
        id: 101,
        type: "discovery",
        state: "failed",
        step: "discovery",
        attempt: 1,
        retry_of_operation_id: null,
        progress: { stage: "discovery", percentage: 10, message: "Falha" },
        result: null,
        error: {
          code: "discovery_failed",
          message: "Invalid source(s): {'contract_discoverer_abc'}.",
        },
        created_at: "2026-07-27T12:00:00Z",
        completed_at: "2026-07-27T12:01:00Z",
      }],
    });

    render(<OnboardingExecutionTimeline execution={failed} history={[failed]} onExecution={vi.fn()} />);

    expect(screen.getByText(/configuração de Discovery usa uma fonte sem suporte/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Revisar configuração fixada" }));
    expect(screen.getByRole("region", { name: "Configuração fixada do Discovery" })).toHaveTextContent("contract_discoverer_abc");
    expect(screen.getByRole("button", { name: "Retentar etapa com falha" })).toBeInTheDocument();
  });

  it("keeps the worker error behind technical details", () => {
    const failed = execution({
      state: "requires_attention",
      current_step: "discovery",
      attention: {
        code: "child_operation_failed",
        category: "unknown",
        message: "A etapa falhou. Consulte os detalhes técnicos antes de tentar novamente.",
      },
      recovery_actions: [{
        key: "retry_failed_operation",
        priority: "primary",
        enabled: true,
        reason: "A retentativa preserva as entradas e a tentativa original.",
      }],
      next_action: "retry_failed_operation",
      operations: [{
        id: 101,
        type: "discovery",
        state: "failed",
        step: "discovery",
        attempt: 1,
        retry_of_operation_id: null,
        progress: { stage: "discovery", percentage: 10, message: "Falha" },
        result: null,
        error: { code: "discovery_failed", message: "Raw worker traceback" },
        created_at: "2026-07-27T12:00:00Z",
        completed_at: "2026-07-27T12:01:00Z",
      }],
    });

    render(<OnboardingExecutionTimeline execution={failed} history={[failed]} onExecution={vi.fn()} />);

    const summary = screen.getByText("Ver detalhes técnicos");
    const details = summary.closest("details");
    expect(details).not.toHaveAttribute("open");
    expect(details).toHaveTextContent("discovery_failed: Raw worker traceback");

    fireEvent.click(summary);
    expect(details).toHaveAttribute("open");
  });

  it("keeps recovery controls read-only without execution permission", () => {
    useAuthStore.getState().setUser({
      id: 2,
      name: "Viewer",
      email: "viewer@example.com",
      is_platform_admin: false,
      permissions: ["crawler.view"],
    });
    const failed = execution({
      state: "requires_attention",
      current_step: "discovery",
      attention: {
        code: "child_operation_failed",
        category: "transient",
        message: "A etapa falhou por um problema transitório e pode ser retentada.",
      },
      recovery_actions: [{
        key: "retry_failed_operation",
        priority: "primary",
        enabled: true,
        reason: "A nova tentativa preservará as mesmas entradas.",
      }],
      next_action: "retry_failed_operation",
    });

    render(<OnboardingExecutionTimeline execution={failed} history={[failed]} onExecution={vi.fn()} />);

    expect(screen.getByText(/somente leitura/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retentar etapa com falha" })).not.toBeInTheDocument();
  });

  it("starts or retries first production with an operation-only discovery override", async () => {
    const waiting = execution({
      state: "awaiting_first_production",
      current_step: "first_production",
      next_action: "start_first_production",
    });
    const running = execution({ state: "running", current_step: "first_production", next_action: "wait_for_current_operation" });
    vi.mocked(startOnboardingFirstProduction).mockResolvedValue(running);

    render(<OnboardingExecutionTimeline execution={waiting} history={[waiting]} onExecution={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Discovery desta operação"), { target: { value: "validation_snapshot" } });
    expect(screen.getByText(/vale somente para esta operação/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Executar primeira produção" }));

    await waitFor(() => expect(startOnboardingFirstProduction).toHaveBeenCalledWith(91, "validation_snapshot"));
  });

  it("requires explicit policy creation before approving a point Discovery configuration", async () => {
    const point = execution({
      discovery_policy_version_id: null,
      resolved_configuration: {
        ...execution().resolved_configuration,
        discovery_policy: {
          id: null,
          name: "Point Configuration",
          version: null,
          source: "point_configuration",
          strategies: ["sitemap"],
          configuration: {},
        },
      },
    });
    const versioned = execution({ discovery_policy_version_id: 88 });
    vi.mocked(saveOnboardingPointConfiguration).mockResolvedValue({
      id: 88,
      policy_key: "explicit-point",
      name: "Litoral automatizado — Discovery",
      version: 1,
      status: "available",
      strategies: ["sitemap"],
      configuration: {},
      mutable: false,
      model_reference_count: 0,
      active_model_reference_count: 0,
      created_by: 1,
      created_at: "2026-07-27T12:00:00Z",
    });
    vi.mocked(getOnboardingExecution).mockResolvedValue(versioned);
    const onExecution = vi.fn();

    render(<OnboardingExecutionTimeline execution={point} history={[point]} onExecution={onExecution} />);

    expect(screen.queryByRole("button", { name: "Aprovar e continuar" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/Confirmo a criação desta nova política ativa/));
    fireEvent.click(screen.getByRole("button", { name: "Salvar como nova política ativa" }));

    await waitFor(() => expect(saveOnboardingPointConfiguration).toHaveBeenCalledWith(
      42,
      "discovery",
      "Litoral automatizado — Discovery",
    ));
    expect(onExecution).toHaveBeenCalledWith(versioned);
  });
});
