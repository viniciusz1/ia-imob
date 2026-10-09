"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { testCrawlerIntegration, dispatchAuctionSource, listAuctionSourceRuns, createAuctionSource, type AuctionCrawlRun } from "@/services/crawlerService";
import type { CrawlerIntegration, CrawlerOverview, AuctionCrawlerSource } from "@/types/crawler";
import { toast } from "sonner";

export function CrawlerOverviewDashboard({
  initialOverview,
  integrations,
  auctionSources,
}: {
  initialOverview: CrawlerOverview;
  integrations: CrawlerIntegration[];
  auctionSources: AuctionCrawlerSource[];
}) {
  const [testResults, setTestResults] = useState<Record<string, string>>({});
  const [sourceRuns, setSourceRuns] = useState<Record<number, AuctionCrawlRun[]>>({});
  const [loadingRuns, setLoadingRuns] = useState<Record<number, boolean>>({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newSourceName, setNewSourceName] = useState("");
  const [newSourceUrl, setNewSourceUrl] = useState("");

  const metrics = [
    { label: "Crawl Agencies", value: initialOverview.agencies.total, href: "/admin/crawler/agencies" },
    { label: "Operações ativas", value: initialOverview.operations.active, href: "/admin/crawler/operations?state=running" },
    { label: "Falhas", value: initialOverview.operations.failed, href: "/admin/crawler/operations?state=failed" },
    { label: "Circuitos abertos", value: initialOverview.open_circuits, href: "#alertas" },
    { label: "Snapshots em quarentena", value: initialOverview.quarantined_snapshots, href: "/admin/crawler/quality" },
  ];

  const testIntegration = async (integration: CrawlerIntegration) => {
    const result = await testCrawlerIntegration(integration.key);
    setTestResults((current) => ({ ...current, [integration.key]: result.message }));
  };

  const triggerDispatch = async (sourceId: number) => {
    try {
      await dispatchAuctionSource(sourceId);
      toast.success("Crawler de leilão despachado com sucesso!");
      // Reload runs after a few seconds
      setTimeout(() => loadRuns(sourceId), 2000);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.source?.[0] || "Erro ao despachar crawler de leilão.";
      toast.error(msg);
      console.error(err);
    }
  };

  const loadRuns = async (sourceId: number) => {
    setLoadingRuns((prev) => ({ ...prev, [sourceId]: true }));
    try {
      const runs = await listAuctionSourceRuns(sourceId);
      setSourceRuns((prev) => ({ ...prev, [sourceId]: runs }));
    } catch (err) {
      toast.error("Erro ao carregar execuções.");
      console.error(err);
    } finally {
      setLoadingRuns((prev) => ({ ...prev, [sourceId]: false }));
    }
  };

  const handleCreateSource = async () => {
    if (!newSourceName || !newSourceUrl) {
      toast.error("Preencha todos os campos.");
      return;
    }
    try {
      await createAuctionSource({
        name: newSourceName,
        type: "sitemap",
        config: { sitemap_url: newSourceUrl }
      });
      toast.success("Fonte criada com sucesso! Atualize a página.");
      setIsDialogOpen(false);
      setNewSourceName("");
      setNewSourceUrl("");
    } catch (err) {
      toast.error("Erro ao criar fonte.");
      console.error(err);
    }
  };

  return <section className="space-y-6">
    <div>
      <h2 className="text-lg font-semibold">Visão geral</h2>
      <p className="text-muted-foreground">Saúde, fila, qualidade e integrações do Crawler Machine.</p>
    </div>

    <Tabs defaultValue="agencies" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="agencies">Imobiliárias</TabsTrigger>
        <TabsTrigger value="auctions">Leilões</TabsTrigger>
      </TabsList>

      <TabsContent value="agencies" className="space-y-6">
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
      </TabsContent>

      <TabsContent value="auctions" className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Fontes de Leilão</CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Nova Fonte</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Fonte de Leilão</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome (ex: Núcleo Leilões)</Label>
                    <Input id="name" value={newSourceName} onChange={(e) => setNewSourceName(e.target.value)} placeholder="Nome do Leiloeiro" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="url">URL do Sitemap (XML)</Label>
                    <Input id="url" value={newSourceUrl} onChange={(e) => setNewSourceUrl(e.target.value)} placeholder="https://site.com/sitemap.xml" />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancelar</Button>
                  </DialogClose>
                  <Button onClick={handleCreateSource}>Salvar Fonte</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {auctionSources.length === 0 && <p>Nenhuma fonte de leilão configurada.</p>}
            <div className="space-y-4">
              {auctionSources.map((source) => (
                <div key={source.id} className="flex flex-col gap-4 rounded-md border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{source.name}</h3>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline">Tipo: {source.type}</Badge>
                        <Badge variant={source.is_active ? "default" : "secondary"}>
                          {source.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                      {source.last_run_at && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Última execução: {new Date(source.last_run_at).toLocaleString("pt-BR")}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => loadRuns(source.id)} 
                        variant="outline"
                        disabled={loadingRuns[source.id]}
                      >
                        {loadingRuns[source.id] ? "Carregando..." : "Ver Execuções"}
                      </Button>
                      <Button 
                        onClick={() => triggerDispatch(source.id)} 
                        disabled={!source.is_active}
                        variant="default"
                      >
                        Rodar Crawler
                      </Button>
                    </div>
                  </div>

                  {sourceRuns[source.id] && (
                    <div className="mt-4 space-y-2 border-t pt-4">
                      <h4 className="font-medium">Últimas Execuções</h4>
                      {sourceRuns[source.id].length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhuma execução registrada.</p>
                      ) : (
                        sourceRuns[source.id].map(run => (
                          <div key={run.id} className="text-sm p-3 bg-muted rounded-md flex flex-col gap-2">
                            <div className="flex justify-between font-medium">
                              <span>Execução #{run.id} - {run.status}</span>
                              <Badge variant={run.status === 'succeeded' ? 'default' : run.status === 'running' ? 'secondary' : 'destructive'}>
                                {run.status}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                              <p>Estágio: {run.stage || '-'}</p>
                              <p>Processados: {run.processed || 0}</p>
                              <p>Ingeridos: {run.ingested}</p>
                              <p>Falhas: {run.failed}</p>
                            </div>
                            {run.log && run.log.length > 0 && (
                              <div className="mt-2 text-xs bg-background p-2 rounded max-h-32 overflow-y-auto">
                                {run.log.map((l, i) => (
                                  <div key={i} className={`mb-1 ${l.level === 'error' ? 'text-red-500' : ''}`}>
                                    [{new Date(l.at).toLocaleTimeString()}] {l.message}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  </section>;
}
