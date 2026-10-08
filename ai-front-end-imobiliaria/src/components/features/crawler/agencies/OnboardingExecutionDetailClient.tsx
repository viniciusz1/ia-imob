"use client";

import { ArrowLeft, CircleAlert, Fingerprint, Lock } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { SectionHeader } from "@/components/layout/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { CrawlAgency, OnboardingExecution } from "@/types/crawler";

import { CrawlAgencyContextHeader } from "./CrawlAgencyContextHeader";
import { OnboardingExecutionTimeline } from "./OnboardingExecutionTimeline";
import { useOnboardingExecutionPolling } from "./useOnboardingExecutionPolling";

interface OnboardingExecutionDetailClientProps {
  agency: CrawlAgency;
  initialExecution: OnboardingExecution;
}

interface DetailRow {
  label: string;
  value: ReactNode;
  hint?: string;
}

function DetailList({ rows }: { rows: DetailRow[] }) {
  return (
    <dl className="divide-y">
      {rows.map((row) => (
        <div className="flex items-start justify-between gap-4 px-4 py-3 sm:px-5" key={row.label}>
          <dt className="text-sm text-muted-foreground">{row.label}</dt>
          <dd className="min-w-0 text-right">
            <span className="block text-sm break-words text-foreground">{row.value}</span>
            {row.hint && <span className="block text-xs break-words text-muted-foreground">{row.hint}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
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

  const identityRows: DetailRow[] = [
    { label: "Nome", value: execution.name },
    { label: "Responsável", value: execution.created_by.name },
    { label: "Plano", value: <span className="tabular-nums">#{execution.onboarding_plan_id}</span> },
    {
      label: "Contrato de dados",
      value: <span className="tabular-nums">v{execution.resolved_configuration.market_data_contract.version}</span>,
    },
  ];

  const configurationRows: DetailRow[] = [
    {
      label: "Modelo de Execução",
      value: model === null ? "Configuração manual" : `${model.name} v${model.version}`,
    },
    {
      label: "Política de Discovery",
      value: `${discovery.name} ${discovery.version === null ? "· pontual" : `v${discovery.version}`}`,
      hint: discovery.strategies.join(", ") || "Nenhuma estratégia",
    },
    {
      label: "Política de Extração",
      value: `${extraction.name} ${extraction.version === null ? "· pontual" : `v${extraction.version}`}`,
      hint: extraction.strategies.join(", ") || "Nenhuma estratégia",
    },
  ];

  return (
    <div className="space-y-6">
      <CrawlAgencyContextHeader
        agency={agency}
        area={`Execução de Onboarding #${execution.id}`}
        description={`${execution.name} · detalhe imutável e compartilhável`}
      />

      <div>
        <Button asChild size="sm" variant="ghost">
          <Link href={`/admin/crawler/agencies/${agency.id}/onboarding`}>
            <ArrowLeft />
            Voltar ao Onboarding
          </Link>
        </Button>
      </div>

      {pollingFailed && (
        <div
          className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm"
          role="alert"
        >
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-destructive" />
          <p>Não foi possível atualizar esta execução. O detalhe abaixo mantém os últimos dados recebidos.</p>
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card className="gap-0 overflow-hidden py-0">
          <SectionHeader
            actions={
              <Badge variant="muted">{execution.conduction === "automated" ? "Automatizada" : "Manual"}</Badge>
            }
            as="h3"
            icon={Fingerprint}
            title="Identidade da execução"
          />
          <DetailList rows={identityRows} />
        </Card>

        <section aria-label="Configuração fixada">
          <Card className="gap-0 overflow-hidden py-0">
            <SectionHeader as="h3" icon={Lock} title="Configuração fixada" />
            <DetailList rows={configurationRows} />
          </Card>
        </section>
      </div>

      <OnboardingExecutionTimeline execution={execution} history={[execution]} onExecution={updateExecution} />
    </div>
  );
}
