"use client";

import { CircleAlert, History, Plus, Rocket, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { EmptyState } from "@/components/layout/EmptyState";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  CrawlAgency,
  DiscoveryPolicyVersion,
  DiscoverySnapshot,
  DiscoveryStrategy,
  ExtractionPolicyVersion,
  OnboardingExecution,
  OnboardingExecutionModelVersion,
  OnboardingExecutionStepKey,
  OnboardingPlan,
} from "@/types/crawler";

import { CrawlAgencyContextHeader } from "./CrawlAgencyContextHeader";
import { OnboardingExecutionTimeline } from "./OnboardingExecutionTimeline";
import { OnboardingPlanBuilder } from "./OnboardingPlanBuilder";
import { useOnboardingExecutionPolling } from "./useOnboardingExecutionPolling";

interface CrawlAgencyOnboardingClientProps {
  agency: CrawlAgency;
  discoveryPolicies?: DiscoveryPolicyVersion[];
  discoveryStrategies?: DiscoveryStrategy[];
  extractionPolicies?: ExtractionPolicyVersion[];
  initialExecutions: OnboardingExecution[];
  initialOpenModal?: boolean;
  models?: OnboardingExecutionModelVersion[];
  plan?: OnboardingPlan | null;
  snapshots?: DiscoverySnapshot[];
}

type StateBadgeVariant = "success" | "warning" | "info" | "destructive" | "muted";

const STEP_LABELS: Record<OnboardingExecutionStepKey, string> = {
  discovery: "Discovery",
  sample_url_confirmation: "Confirmação da URL de Amostra",
  profile_generation: "Geração do Perfil de Extração",
  profile_validation: "Crawl de Validação",
  approval: "Aprovação humana",
  first_production: "Primeira produção",
  quality_gate: "Quality Gate e publicação",
};

const STATE_LABELS: Record<OnboardingExecution["state"], string> = {
  queued: "Preparando próxima etapa",
  running: "Em andamento",
  awaiting_manual_step: "Aguardando comando manual",
  requires_attention: "Requer atenção",
  awaiting_approval: "Aguardando aprovação",
  awaiting_first_production: "Aguardando primeira produção",
  completed: "Concluída",
  cancelled: "Cancelada",
};

const STATE_BADGE_VARIANTS: Record<OnboardingExecution["state"], StateBadgeVariant> = {
  queued: "muted",
  running: "info",
  awaiting_manual_step: "warning",
  requires_attention: "destructive",
  awaiting_approval: "warning",
  awaiting_first_production: "warning",
  completed: "success",
  cancelled: "muted",
};

function formatDate(value: string | null): string {
  if (value === null) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function shouldOpenFromLocation(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.get("novo") === "true" || params.get("new") === "true";
}

function isOpenExecution(execution: OnboardingExecution): boolean {
  return !["completed", "cancelled"].includes(execution.state);
}

export function CrawlAgencyOnboardingClient({
  agency,
  discoveryPolicies = [],
  discoveryStrategies = [],
  extractionPolicies = [],
  initialExecutions,
  initialOpenModal = false,
  models = [],
  plan = null,
  snapshots = [],
}: CrawlAgencyOnboardingClientProps) {
  const [executions, setExecutions] = useState(initialExecutions);
  const [pollingFailed, setPollingFailed] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(() => initialOpenModal || shouldOpenFromLocation());
  const currentExecution = executions[0] ?? null;

  const resolvedPlan: OnboardingPlan = plan ?? {
    id: 0,
    prospect_id: null,
    crawl_agency_id: agency.id,
    status: "draft",
    name: null,
    conduction: null,
    execution_model_version_id: null,
    execution_model: null,
    manual_configuration: null,
    first_production_discovery_mode: "fresh",
    steps: [],
    confirmed_by: null,
    confirmed_at: null,
    created_by: null,
    created_at: agency.created_at,
    updated_at: agency.updated_at,
  };

  const updateExecution = (updated: OnboardingExecution) => {
    setPollingFailed(false);
    setExecutions((current) => [
      updated,
      ...current.filter((execution) => execution.id !== updated.id),
    ]);
  };

  useOnboardingExecutionPolling({
    execution: currentExecution,
    onError: () => setPollingFailed(true),
    onExecution: updateExecution,
  });

  const handleModalOpenChange = (open: boolean) => {
    setIsModalOpen(open);
    if (!open && typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.has("novo") || url.searchParams.has("new")) {
        url.searchParams.delete("novo");
        url.searchParams.delete("new");
        window.history.replaceState({}, "", url.pathname + url.search);
      }
    }
  };

  return (
    <div className="space-y-6">
      <CrawlAgencyContextHeader
        agency={agency}
        area="Onboarding"
        description="Execução atual, recuperação e histórico imutável desta Crawl Agency."
      />

      <div className="flex justify-end">
        <Button onClick={() => setIsModalOpen(true)} type="button">
          <Plus />
          Novo Onboarding
        </Button>
      </div>

      <Dialog onOpenChange={handleModalOpenChange} open={isModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Plano de Onboarding</DialogTitle>
            <DialogDescription>
              Monte, nomeie e revise a combinação. Nenhuma Operação do Crawler começa antes da confirmação.
            </DialogDescription>
          </DialogHeader>

          {currentExecution !== null && isOpenExecution(currentExecution) && (
            <div
              className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm"
              role="note"
            >
              <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />
              <div>
                <p className="text-foreground">Substituição do Onboarding atual</p>
                <p className="mt-1 text-muted-foreground">
                  A execução atual (#{currentExecution.id} · {currentExecution.name}) será cancelada e substituída por esta nova execução ao confirmar.
                </p>
              </div>
            </div>
          )}

          <OnboardingPlanBuilder
            agency={agency}
            discoveryPolicies={discoveryPolicies}
            discoveryStrategies={discoveryStrategies}
            extractionPolicies={extractionPolicies}
            inModal
            models={models}
            onConfirmed={(confirmed) => {
              handleModalOpenChange(false);
              setPollingFailed(false);
              setExecutions((current) => [
                confirmed,
                ...current
                  .filter((execution) => execution.id !== confirmed.id)
                  .map((execution) =>
                    isOpenExecution(execution)
                      ? { ...execution, state: "cancelled" as const, completed_at: new Date().toISOString() }
                      : execution,
                  ),
              ]);
            }}
            plan={resolvedPlan}
            snapshots={snapshots}
          />
        </DialogContent>
      </Dialog>

      {pollingFailed && (
        <div
          className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm"
          role="alert"
        >
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-destructive" />
          <p>Não foi possível atualizar a Execução de Onboarding. Os últimos dados recebidos continuam visíveis.</p>
        </div>
      )}

      {currentExecution === null && (
        <Card className="gap-0 overflow-hidden py-0">
          <SectionHeader as="h3" icon={Rocket} title="Execuções de Onboarding" />
          <EmptyState icon={Rocket} title="Nenhuma Execução de Onboarding foi iniciada." variant="inline" />
        </Card>
      )}

      {currentExecution !== null && (
        <section aria-labelledby="current-onboarding-execution" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base text-foreground" id="current-onboarding-execution">Execução atual</h3>
            <Link
              className="rounded-sm text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              href={`/admin/crawler/agencies/${agency.id}/onboarding/${currentExecution.id}`}
            >
              Abrir detalhe da execução #{currentExecution.id}
            </Link>
          </div>
          <OnboardingExecutionTimeline
            execution={currentExecution}
            history={[currentExecution]}
            onExecution={updateExecution}
          />
        </section>
      )}

      <section aria-label="Histórico de Execuções de Onboarding">
        <Card className="gap-0 overflow-hidden py-0">
          <SectionHeader
            as="h3"
            description="Todas as versões de onboarding executadas para esta Crawl Agency."
            icon={History}
            title="Histórico de versões"
          />
          {executions.length === 0 ? (
            <EmptyState icon={History} title="Nenhuma versão registrada no histórico." variant="inline" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Versão / Execução</TableHead>
                  <TableHead>Condução e modelo</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {executions.map((execution, index) => {
                  const versionNumber = executions.length - index;
                  const isCurrent = execution.id === currentExecution?.id;
                  const model = execution.resolved_configuration.execution_model;
                  const modelLabel = model === null ? "Sem modelo" : `${model.name} v${model.version}`;

                  return (
                    <TableRow key={execution.id}>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={isCurrent ? "info" : "muted"}>v{versionNumber}</Badge>
                          <span className="text-foreground">#{execution.id} · {execution.name}</span>
                          {isCurrent && <Badge variant="outline">Atual</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {execution.conduction === "automated" ? "Automatizada" : "Manual"} · {modelLabel}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        Última etapa: {STEP_LABELS[execution.current_step]}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATE_BADGE_VARIANTS[execution.state]}>{STATE_LABELS[execution.state]}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground tabular-nums">
                        <div>Início: {formatDate(execution.started_at)}</div>
                        <div>Término: {formatDate(execution.completed_at)}</div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        Responsável: {execution.created_by.name}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          className="inline-flex rounded-sm text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                          href={`/admin/crawler/agencies/${agency.id}/onboarding/${execution.id}`}
                        >
                          Abrir execução #{execution.id}
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>
      </section>
    </div>
  );
}
