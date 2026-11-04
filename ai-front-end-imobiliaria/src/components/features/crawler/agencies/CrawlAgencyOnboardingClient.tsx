"use client";

import { useState } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    prospect_id: 0,
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
    created_by: 0,
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
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <CrawlAgencyContextHeader
            agency={agency}
            area="Onboarding"
            description="Execução atual, recuperação e histórico imutável desta Crawl Agency."
          />
        </div>
        <Button onClick={() => setIsModalOpen(true)} type="button">
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

          {currentExecution !== null && !["completed", "cancelled"].includes(currentExecution.state) && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm" role="note">
              <p className="font-medium">Substituição do Onboarding atual</p>
              <p className="mt-1 text-muted-foreground">
                A execução atual (#{currentExecution.id} · {currentExecution.name}) será cancelada e substituída por esta nova execução ao confirmar.
              </p>
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
                    !["completed", "cancelled"].includes(execution.state)
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
        <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm" role="alert">
          Não foi possível atualizar a Execução de Onboarding. Os últimos dados recebidos continuam visíveis.
        </p>
      )}

      {currentExecution === null && (
        <Card>
          <CardHeader><CardTitle>Execuções de Onboarding</CardTitle></CardHeader>
          <CardContent className="text-muted-foreground">
            Nenhuma Execução de Onboarding foi iniciada.
          </CardContent>
        </Card>
      )}

      {currentExecution !== null && (
        <section aria-labelledby="current-onboarding-execution" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold" id="current-onboarding-execution">Execução atual</h3>
            <Link className="rounded-sm text-sm underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href={`/admin/crawler/agencies/${agency.id}/onboarding/${currentExecution.id}`}>
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
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Versões</CardTitle>
            <CardDescription>Todas as versões de onboarding executadas para esta Crawl Agency.</CardDescription>
          </CardHeader>
          <CardContent>
            {executions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma versão registrada no histórico.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead>Versão / Execução</TableHead>
                      <TableHead>Condução e Modelo</TableHead>
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
                              <Badge variant={isCurrent ? "default" : "outline"}>v{versionNumber}</Badge>
                              <span className="font-medium">#{execution.id} · {execution.name}</span>
                              {isCurrent && <Badge variant="secondary">Atual</Badge>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span>{execution.conduction === "automated" ? "Automatizada" : "Manual"} · {modelLabel}</span>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            Última etapa: {STEP_LABELS[execution.current_step]}
                          </TableCell>
                          <TableCell>
                            <Badge variant={execution.state === "requires_attention" ? "destructive" : execution.state === "completed" ? "default" : "outline"}>
                              {STATE_LABELS[execution.state]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            <div>Início: {formatDate(execution.started_at)}</div>
                            <div>Término: {formatDate(execution.completed_at)}</div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            Responsável: {execution.created_by.name}
                          </TableCell>
                          <TableCell className="text-right">
                            <Link
                              className="inline-flex rounded-sm text-sm underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </section>
  );
}
