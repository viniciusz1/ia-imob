"use client";

import {
  Activity,
  Building2,
  CircleX,
  HeartPulse,
  Plug,
  ShieldAlert,
  TriangleAlert,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { CrawlerHeaderActions } from "@/components/features/crawler/CrawlerHeaderActions";
import { HealthBadge, LifecycleBadge, OperationStateBadge } from "@/components/features/crawler/CrawlerStatusBadges";
import { EmptyState } from "@/components/layout/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { StatCard } from "@/components/layout/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { testCrawlerIntegration } from "@/services/crawlerService";
import type { CrawlerIntegration, CrawlerOverview } from "@/types/crawler";

function StateCountList({ title, entries, renderBadge }: {
  title: string;
  entries: Array<[string, number]>;
  renderBadge: (state: string) => React.ReactNode;
}) {
  return (
    <div className="space-y-2 px-4 py-4 sm:px-5">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
      <ul className="space-y-2">
        {entries.map(([state, count]) => (
          <li className="flex items-center justify-between gap-3" key={state}>
            {renderBadge(state)}
            <span className="text-sm text-foreground tabular-nums">{count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CrawlerOverviewDashboard({
  initialOverview,
  integrations,
}: {
  initialOverview: CrawlerOverview;
  integrations: CrawlerIntegration[];
}) {
  const [testResults, setTestResults] = useState<Record<string, string>>({});

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
        <StatCard href="/admin/crawler/operations?state=running" icon={Activity} title="Operações ativas" tone="info" value={initialOverview.operations.active} />
        <StatCard href="/admin/crawler/operations?state=failed" icon={CircleX} title="Falhas" tone="destructive" value={initialOverview.operations.failed} />
        <StatCard href="#alertas" icon={Zap} title="Circuitos abertos" tone="warning" value={initialOverview.open_circuits} />
        <StatCard href="/admin/crawler/quality" icon={ShieldAlert} title="Snapshots em quarentena" tone="warning" value={initialOverview.quarantined_snapshots} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="gap-0 overflow-hidden py-0">
          <SectionHeader href="/admin/crawler/agencies" icon={HeartPulse} title="Estado das Crawl Agencies" />
          <div className="grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <StateCountList
              entries={Object.entries(initialOverview.agencies.lifecycle)}
              renderBadge={(state) => <LifecycleBadge state={state} />}
              title="Ciclo de vida"
            />
            <StateCountList
              entries={Object.entries(initialOverview.agencies.health)}
              renderBadge={(state) => <HealthBadge state={state} />}
              title="Saúde"
            />
          </div>
        </Card>

        <Card className="gap-0 overflow-hidden py-0">
          <SectionHeader href="/admin/crawler/operations" icon={Activity} linkLabel="Ver fila" title="Operações ativas" />
          {initialOverview.active_operations.length === 0 ? (
            <EmptyState icon={Activity} title="Nenhuma operação ativa." variant="inline" />
          ) : (
            <ul className="divide-y">
              {initialOverview.active_operations.map((operation) => (
                <li key={operation.id}>
                  <Link
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 sm:px-5"
                    href={`/admin/crawler/operations?operation=${operation.id}`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-foreground">#{operation.id} · {operation.type}</span>
                      {operation.crawl_agency && (
                        <span className="block truncate text-xs text-muted-foreground">{operation.crawl_agency.name}</span>
                      )}
                    </span>
                    <OperationStateBadge state={operation.state} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="scroll-mt-6 gap-0 overflow-hidden py-0" id="alertas">
        <SectionHeader icon={TriangleAlert} title="Alertas internos" />
        {initialOverview.alerts.length === 0 ? (
          <EmptyState icon={TriangleAlert} title="Nenhum alerta operacional." variant="inline" />
        ) : (
          <ul className="divide-y">
            {initialOverview.alerts.map((alert, index) => (
              <li className="flex items-start gap-3 px-4 py-3 sm:px-5" key={`${alert.kind}-${index}`}>
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
                <div className="min-w-0">
                  <Link className="text-sm text-foreground hover:text-primary hover:underline" href={alert.href}>
                    {alert.title}
                  </Link>
                  {alert.detail && <p className="text-xs text-muted-foreground">{alert.detail}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="gap-0 overflow-hidden py-0">
        <SectionHeader description="Serviços externos usados pelo Crawler." icon={Plug} title="Integrações" />
        {integrations.length === 0 ? (
          <EmptyState icon={Plug} title="Nenhuma integração configurada." variant="inline" />
        ) : (
          <div className="grid gap-4 p-4 sm:p-5 md:grid-cols-2">
            {integrations.map((integration) => (
              <div className="space-y-3 rounded-lg border p-4" key={integration.key}>
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
