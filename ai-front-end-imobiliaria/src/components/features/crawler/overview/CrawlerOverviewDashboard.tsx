"use client";

import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { testCrawlerIntegration } from "@/services/crawlerService";
import type { CrawlerIntegration, CrawlerOverview, WorkerInstance } from "@/types/crawler";

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
  const metrics: { label: string; value: number; href?: string }[] = [
    { label: "Crawl Agencies", value: initialOverview.agencies.total, href: "/admin/crawler/agencies" },
    { label: "Operações ativas", value: initialOverview.operations.active },
    { label: "Falhas", value: initialOverview.operations.failed },
    { label: "Circuitos abertos", value: initialOverview.open_circuits },
    { label: "Snapshots em quarentena", value: initialOverview.quarantined_snapshots, href: "/admin/crawler/quality" },
  ];

  const activeWorkers = workers.filter((worker) => worker.health_state !== "unavailable");

  const testIntegration = async (integration: CrawlerIntegration) => {
    const result = await testCrawlerIntegration(integration.key);
    setTestResults((current) => ({ ...current, [integration.key]: result.message }));
  };

  return <section className="space-y-6">
    <div>
      <h2 className="text-lg font-semibold">Visão geral</h2>
      <p className="text-muted-foreground">Saúde, fila, qualidade e integrações do Crawler Machine.</p>
    </div>

    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {metrics.map((metric) => <Card key={metric.label}>
        <CardHeader><CardTitle className="text-sm">{metric.href ? <Link href={metric.href}>{metric.label}</Link> : metric.label}</CardTitle></CardHeader>
        <CardContent className="text-3xl font-semibold">{metric.value}</CardContent>
      </Card>)}
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Estado das Crawl Agencies</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {Object.entries(initialOverview.agencies.lifecycle).map(([state, count]) => <Badge key={state} variant="outline">{state}: {count}</Badge>)}
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(initialOverview.agencies.health).map(([state, count]) => <Badge key={state} variant={state === "degraded" || state === "unavailable" ? "destructive" : "secondary"}>{state}: {count}</Badge>)}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Operações ativas</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {initialOverview.active_operations.length === 0 && <p>Nenhuma operação ativa.</p>}
          {initialOverview.active_operations.map((operation) => <p key={operation.id}>#{operation.id} · {operation.type}</p>)}
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader><CardTitle>Workers ativos</CardTitle></CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {activeWorkers.length === 0 && <p>Nenhum worker ativo.</p>}
        {activeWorkers.map((worker) => <Badge key={worker.id} variant="secondary">{worker.worker_key}</Badge>)}
      </CardContent>
    </Card>

    <Card>
      <CardHeader><CardTitle>Integrações</CardTitle></CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        {integrations.length === 0 && <p>Nenhuma integração configurada.</p>}
        {integrations.map((integration) => <div className="space-y-2 rounded-md border p-3" key={integration.key}>
          <div className="flex items-center justify-between"><p className="font-medium">{integration.label}</p><Badge>{integration.availability}</Badge></div>
          <p className="font-mono text-sm">{integration.credential_identifier ?? "Credencial ausente"}</p>
          <Button onClick={() => void testIntegration(integration)} size="sm" type="button" variant="outline">Testar {integration.label}</Button>
          {testResults[integration.key] && <p className="text-sm">{testResults[integration.key]}</p>}
        </div>)}
      </CardContent>
    </Card>
  </section>;
}
