"use client";

import { useState } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CrawlAgency, OnboardingExecution, OnboardingExecutionStepKey } from "@/types/crawler";

import { CrawlAgencyContextHeader } from "./CrawlAgencyContextHeader";
import { OnboardingExecutionTimeline } from "./OnboardingExecutionTimeline";
import { useOnboardingExecutionPolling } from "./useOnboardingExecutionPolling";

interface CrawlAgencyOnboardingClientProps {
  agency: CrawlAgency;
  initialExecutions: OnboardingExecution[];
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
    <section className="space-y-6">
      <CrawlAgencyContextHeader
        agency={agency}
        area="Onboarding"
        description="Execução atual, recuperação e histórico imutável desta Crawl Agency."
      />

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

      {executions.length > 1 && (
        <section aria-label="Histórico de Execuções de Onboarding">
          <Card>
            <CardHeader><CardTitle>Histórico</CardTitle></CardHeader>
            <CardContent>
              <ol className="space-y-3">
                {executions.slice(1).map((execution) => {
                  const model = execution.resolved_configuration.execution_model;
                  const modelLabel = model === null ? "Sem modelo" : `${model.name} v${model.version}`;

                  return (
                    <li className="space-y-2 rounded-lg border p-4" key={execution.id}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">#{execution.id} · {execution.name}</p>
                        <Badge variant="outline">{STATE_LABELS[execution.state]}</Badge>
                      </div>
                      <p className="text-sm">{execution.conduction === "automated" ? "Automatizada" : "Manual"} · {modelLabel}</p>
                      <p className="text-sm text-muted-foreground">Última etapa: {STEP_LABELS[execution.current_step]}</p>
                      <p className="text-sm text-muted-foreground">Início: {formatDate(execution.started_at)} · Término: {formatDate(execution.completed_at)}</p>
                      <p className="text-sm text-muted-foreground">Responsável: {execution.created_by.name}</p>
                      <Link className="inline-flex rounded-sm text-sm underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href={`/admin/crawler/agencies/${agency.id}/onboarding/${execution.id}`}>
                        Abrir execução #{execution.id}
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </CardContent>
          </Card>
        </section>
      )}
    </section>
  );
}
