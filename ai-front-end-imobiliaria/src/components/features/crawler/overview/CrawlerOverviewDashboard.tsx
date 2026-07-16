"use client";

import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { testCrawlerIntegration } from "@/services/crawlerService";
import type { CrawlerIntegration, CrawlerOverview } from "@/types/crawler";

export function CrawlerOverviewDashboard({
  initialOverview,
  integrations,
}: {
  initialOverview: CrawlerOverview;
  integrations: CrawlerIntegration[];
}) {
  const [testResults, setTestResults] = useState<Record<string, string>>({});
  const metrics = [
    { label: "Crawl Agencies", value: initialOverview.agencies.total, href: "/admin/crawler/agencies" },
    { label: "Operações ativas", value: initialOverview.operations.active, href: "/admin/crawler/operations?state=running" },
    { label: "Falhas", value: initialOverview.operations.failed, href: "/admin/crawler/operations?state=failed" },
    { label: "Circuitos abertos", value: initialOverview.open_circuits, href: "#alertas" },
    { label: "Snapshots em quarentena", value: initialOverview.quarantined_snapshots, href: "#alertas" },
  ];

  const testIntegration = async (integration: CrawlerIntegration) => {
    const result = await testCrawlerIntegration(integration.key);
    setTestResults((current) => ({ ...current, [integration.key]: result.message }));
  };

  return <section className="space-y-6">
    <div>
      <h2 className="text-2xl font-semibold">Visão geral</h2>
      <p className="text-muted-foreground">Saúde, fila, qualidade e integrações do Crawler Machine.</p>
    </div>

    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {metrics.map((metric) => <Card key={metric.label}>
        <CardHeader><CardTitle className="text-sm"><Link href={metric.href}>{metric.label}</Link></CardTitle></CardHeader>
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
          {initialOverview.active_operations.map((operation) => <Link className="block underline" href={`/admin/crawler/operations?operation=${operation.id}`} key={operation.id}>#{operation.id} · {operation.type}</Link>)}
        </CardContent>
      </Card>
    </div>

    <Card id="alertas">
      <CardHeader><CardTitle>Alertas internos</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {initialOverview.alerts.length === 0 && <p>Nenhum alerta operacional.</p>}
        {initialOverview.alerts.map((alert, index) => <div className="rounded-md border p-3" key={`${alert.kind}-${index}`}>
          <Link className="font-medium underline" href={alert.href}>{alert.title}</Link>
          {alert.detail && <p className="text-sm text-muted-foreground">{alert.detail}</p>}
        </div>)}
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
