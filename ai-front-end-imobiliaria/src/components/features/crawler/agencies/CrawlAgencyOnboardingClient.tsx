"use client";

import { CircleAlert, History, Rocket } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { EmptyState } from "@/components/layout/EmptyState";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { CrawlAgency, OnboardingExecution, OnboardingExecutionStepKey } from "@/types/crawler";

import { CrawlAgencyContextHeader } from "./CrawlAgencyContextHeader";
import { OnboardingExecutionTimeline } from "./OnboardingExecutionTimeline";
import { useOnboardingExecutionPolling } from "./useOnboardingExecutionPolling";

interface CrawlAgencyOnboardingClientProps {
  agency: CrawlAgency;
  initialExecutions: OnboardingExecution[];
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

export function CrawlAgencyOnboardingClient({
  agency,
  initialExecutions,
}: CrawlAgencyOnboardingClientProps) {
  const [executions, setExecutions] = useState(initialExecutions);
  const [pollingFailed, setPollingFailed] = useState(false);
  const currentExecution = executions[0] ?? null;

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

  return (
    <div className="space-y-6">
      <CrawlAgencyContextHeader
        agency={agency}
        area="Onboarding"
        description="Execução atual, recuperação e histórico imutável desta Crawl Agency."
      />

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

      {executions.length > 1 && (
        <section aria-label="Histórico de Execuções de Onboarding">
          <Card className="gap-0 overflow-hidden py-0">
            <SectionHeader
              as="h3"
              description="Execuções anteriores preservadas para auditoria."
              icon={History}
              title="Histórico"
            />
            <ol className="divide-y">
              {executions.slice(1).map((execution) => {
                const model = execution.resolved_configuration.execution_model;
                const modelLabel = model === null ? "Sem modelo" : `${model.name} v${model.version}`;

                return (
                  <li className="space-y-2 px-4 py-3 sm:px-5" key={execution.id}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm text-foreground">#{execution.id} · {execution.name}</p>
                      <Badge variant={STATE_BADGE_VARIANTS[execution.state]}>{STATE_LABELS[execution.state]}</Badge>
                    </div>
                    <div className="space-y-0.5 text-xs text-muted-foreground">
                      <p>{execution.conduction === "automated" ? "Automatizada" : "Manual"} · {modelLabel}</p>
                      <p>Última etapa: {STEP_LABELS[execution.current_step]}</p>
                      <p className="tabular-nums">
                        Início: {formatDate(execution.started_at)} · Término: {formatDate(execution.completed_at)}
                      </p>
                      <p>Responsável: {execution.created_by.name}</p>
                    </div>
                    <Link
                      className="inline-flex rounded-sm text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                      href={`/admin/crawler/agencies/${agency.id}/onboarding/${execution.id}`}
                    >
                      Abrir execução #{execution.id}
                    </Link>
                  </li>
                );
              })}
            </ol>
          </Card>
        </section>
      )}
    </div>
  );
}
