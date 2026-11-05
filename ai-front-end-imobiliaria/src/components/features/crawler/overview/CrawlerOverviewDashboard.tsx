"use client";

import {
  Activity,
  Building2,
  CircleX,
  Cpu,
  HeartPulse,
  Plug,
  ShieldAlert,
  Zap,
} from "lucide-react";
import { useState } from "react";

import { CrawlerHeaderActions } from "@/components/features/crawler/CrawlerHeaderActions";
import {
  HEALTH_STATUS,
  HealthBadge,
  LIFECYCLE_STATUS,
  LifecycleBadge,
  OperationStateBadge,
} from "@/components/features/crawler/CrawlerStatusBadges";
import { EmptyState } from "@/components/layout/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { StatCard } from "@/components/layout/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChartLegendList, DonutChart, type ChartTone } from "@/components/ui/charts";
import { testCrawlerIntegration } from "@/services/crawlerService";
import type { CrawlerIntegration, CrawlerOverview, WorkerInstance } from "@/types/crawler";

function StateCountList({ title, entries, renderBadge, toneOf }: {
  title: string;
  entries: Array<[string, number]>;
  renderBadge: (state: string) => React.ReactNode;
  toneOf: (state: string) => ChartTone;
}) {
  const segments = entries.map(([state, count]) => ({
    key: state,
    label: renderBadge(state),
    value: count,
    tone: toneOf(state),
  }));

  return (
    <div className="space-y-4 px-6 py-5 sm:px-8">
      <p className="text-sm leading-4 font-semibold text-subtle">{title}</p>
      <div className="flex items-center gap-6">
        <DonutChart label={`Crawl Agencies por ${title.toLowerCase()}`} segments={segments} size={120} />
        <ChartLegendList segments={segments} />
      </div>
    </div>
  );
}

const BADGE_TONE: Record<string, ChartTone> = {
  success: "success",
  warning: "warning",
  destructive: "destructive",
  info: "info",
};

function toneFor<T extends string>(map: Record<T, { variant: string }>, state: string): ChartTone {
  const variant = (map as Record<string, { variant: string } | undefined>)[state]?.variant;
  return (variant && BADGE_TONE[variant]) || "muted";
}

export function CrawlerOverviewDashboard({
  initialOverview,
  integrations,
  workers,
}: {
  initialOverview: CrawlerOverview;
  integrations: CrawlerIntegration[];
  workers: WorkerInstance[];
}) {
  const [testResults, setTestResults] = useState<Record<string, string>>({});

  const activeWorkers = workers.filter((worker) => worker.health_state !== "unavailable");

  const testIntegration = async (integration: CrawlerIntegration) => {
    const result = await testCrawlerIntegration(integration.key);
    setTestResults((current) => ({ ...current, [integration.key]: result.message }));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        actions={<CrawlerHeaderActions actions={["registerAgency", "newProspecting"]} />}
        description="Saúde, fila, qualidade e integrações do Crawler Machine."
        title="Visão geral do Crawler"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard href="/admin/crawler/agencies" icon={Building2} title="Crawl Agencies" value={initialOverview.agencies.total} />
        <StatCard icon={Activity} title="Operações ativas" tone="info" value={initialOverview.operations.active} />
        <StatCard icon={CircleX} title="Falhas" tone="destructive" value={initialOverview.operations.failed} />
        <StatCard icon={Zap} title="Circuitos abertos" tone="warning" value={initialOverview.open_circuits} />
        <StatCard href="/admin/crawler/quality" icon={ShieldAlert} title="Snapshots em quarentena" tone="warning" value={initialOverview.quarantined_snapshots} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="gap-0 overflow-hidden py-0">
          <SectionHeader href="/admin/crawler/agencies" icon={HeartPulse} title="Estado das Crawl Agencies" />
          <div className="grid divide-y xl:grid-cols-2 xl:divide-x xl:divide-y-0">
            <StateCountList
              entries={Object.entries(initialOverview.agencies.lifecycle)}
              renderBadge={(state) => <LifecycleBadge state={state} />}
              title="Ciclo de vida"
              toneOf={(state) => toneFor(LIFECYCLE_STATUS, state)}
            />
            <StateCountList
              entries={Object.entries(initialOverview.agencies.health)}
              renderBadge={(state) => <HealthBadge state={state} />}
              title="Saúde"
              toneOf={(state) => toneFor(HEALTH_STATUS, state)}
            />
          </div>
        </Card>

        <Card className="gap-0 overflow-hidden py-0">
          <SectionHeader href="/admin/crawler/queue" icon={Activity} linkLabel="Ver fila" title="Operações ativas" />
          {initialOverview.active_operations.length === 0 ? (
            <EmptyState icon={Activity} title="Nenhuma operação ativa." variant="inline" />
          ) : (
            <ul className="divide-y">
              {initialOverview.active_operations.map((operation) => (
                <li className="flex items-center gap-3 px-6 py-3 sm:px-8" key={operation.id}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-foreground">#{operation.id} · {operation.type}</span>
                    {operation.crawl_agency && (
                      <span className="block truncate text-xs text-muted-foreground">{operation.crawl_agency.name}</span>
                    )}
                  </span>
                  <OperationStateBadge state={operation.state} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        <SectionHeader icon={Cpu} title="Workers ativos" />
        {activeWorkers.length === 0 ? (
          <EmptyState icon={Cpu} title="Nenhum worker ativo." variant="inline" />
        ) : (
          <div className="flex flex-wrap gap-2 px-6 py-4 sm:px-8">
            {activeWorkers.map((worker) => (
              <Badge className="font-mono" key={worker.id} variant="muted">{worker.worker_key}</Badge>
            ))}
          </div>
        )}
      </Card>

      <Card className="gap-0 overflow-hidden py-0">
        <SectionHeader description="Serviços externos usados pelo Crawler." icon={Plug} title="Integrações" />
        {integrations.length === 0 ? (
          <EmptyState icon={Plug} title="Nenhuma integração configurada." variant="inline" />
        ) : (
          <div className="grid gap-4 px-6 pb-6 sm:px-8 sm:pb-8 md:grid-cols-2">
            {integrations.map((integration) => (
              <div className="space-y-3 rounded-xl border border-transparent bg-muted p-4" key={integration.key}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-foreground">{integration.label}</p>
                  <Badge variant={integration.availability === "configured" ? "success" : "destructive"}>
                    {integration.availability === "configured" ? "Configurada" : "Indisponível"}
                  </Badge>
                </div>
                <p className="font-mono text-xs text-muted-foreground">
                  {integration.credential_identifier ?? "Credencial ausente"}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button onClick={() => void testIntegration(integration)} size="sm" type="button" variant="outline">
                    Testar {integration.label}
                  </Button>
                  {testResults[integration.key] && (
                    <p className="text-xs text-muted-foreground">{testResults[integration.key]}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
