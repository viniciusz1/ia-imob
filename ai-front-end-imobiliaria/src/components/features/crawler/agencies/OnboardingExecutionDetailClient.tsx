"use client";

import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CrawlAgency, OnboardingExecution } from "@/types/crawler";

import { CrawlAgencyContextHeader } from "./CrawlAgencyContextHeader";
import { OnboardingExecutionTimeline } from "./OnboardingExecutionTimeline";
import { useOnboardingExecutionPolling } from "./useOnboardingExecutionPolling";

interface OnboardingExecutionDetailClientProps {
  agency: CrawlAgency;
  initialExecution: OnboardingExecution;
}

export function OnboardingExecutionDetailClient({
  agency,
  initialExecution,
}: OnboardingExecutionDetailClientProps) {
  const [execution, setExecution] = useState(initialExecution);
  const [pollingFailed, setPollingFailed] = useState(false);
  const model = execution.resolved_configuration.execution_model;
  const discovery = execution.resolved_configuration.discovery_policy;
  const extraction = execution.resolved_configuration.extraction_policy;

  const updateExecution = (updated: OnboardingExecution) => {
    setPollingFailed(false);
    setExecution(updated);
  };

  useOnboardingExecutionPolling({
    execution,
    onError: () => setPollingFailed(true),
    onExecution: updateExecution,
  });

  return (
    <section className="space-y-6">
      <CrawlAgencyContextHeader
        agency={agency}
        area={`Execução de Onboarding #${execution.id}`}
        description={`${execution.name} · detalhe imutável e compartilhável`}
      />

      <Link className="inline-flex rounded-sm text-sm underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href={`/admin/crawler/agencies/${agency.id}/onboarding`}>
        Voltar ao Onboarding
      </Link>

      {pollingFailed && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm" role="alert">
          Não foi possível atualizar esta execução. O detalhe abaixo mantém os últimos dados recebidos.
        </p>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Identidade da execução</CardTitle>
            <Badge variant="outline">{execution.conduction === "automated" ? "Automatizada" : "Manual"}</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <p><span className="font-medium">Nome:</span> {execution.name}</p>
          <p><span className="font-medium">Responsável:</span> {execution.created_by.name}</p>
          <p><span className="font-medium">Plano:</span> #{execution.onboarding_plan_id}</p>
          <p><span className="font-medium">Contrato de dados:</span> v{execution.resolved_configuration.market_data_contract.version}</p>
        </CardContent>
      </Card>

      <section aria-label="Configuração fixada">
        <Card>
          <CardHeader><CardTitle>Configuração fixada</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <p className="font-medium">Modelo de Execução</p>
              <p className="text-sm text-muted-foreground">{model === null ? "Configuração manual" : `${model.name} v${model.version}`}</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium">Política de Discovery</p>
              <p className="text-sm text-muted-foreground">{discovery.name} {discovery.version === null ? "· pontual" : `v${discovery.version}`}</p>
              <p className="text-sm text-muted-foreground">{discovery.strategies.join(", ") || "Nenhuma estratégia"}</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium">Política de Extração</p>
              <p className="text-sm text-muted-foreground">{extraction.name} {extraction.version === null ? "· pontual" : `v${extraction.version}`}</p>
              <p className="text-sm text-muted-foreground">{extraction.strategies.join(", ") || "Nenhuma estratégia"}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <OnboardingExecutionTimeline execution={execution} history={[execution]} onExecution={updateExecution} />
    </section>
  );
}
