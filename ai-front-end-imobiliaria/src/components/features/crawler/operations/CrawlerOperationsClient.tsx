"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getCrawlerOperation, queueDiscoveryOperation } from "@/services/crawlerService";
import type {
  CrawlAgency,
  CrawlerOperation,
  MarketDataContract,
  WorkerInstance,
} from "@/types/crawler";

interface CrawlerOperationsClientProps {
  agencies: CrawlAgency[];
  contracts: MarketDataContract[];
  initialOperations: CrawlerOperation[];
  initialWorkers: WorkerInstance[];
}

export function CrawlerOperationsClient({ agencies, contracts, initialOperations, initialWorkers }: CrawlerOperationsClientProps) {
  const [operations, setOperations] = useState(initialOperations);
  const [agencyId, setAgencyId] = useState(agencies[0]?.id.toString() ?? "");
  const activeContracts = contracts.filter((contract) => contract.status === "active");
  const [contractId, setContractId] = useState(activeContracts[0]?.id.toString() ?? "");

  useEffect(() => {
    const activeIds = operations.filter((operation) => ["queued", "running", "cancellation_requested"].includes(operation.state)).map((operation) => operation.id);
    if (activeIds.length === 0) return;

    const interval = window.setInterval(() => {
      void Promise.all(activeIds.map(getCrawlerOperation)).then((updates) => {
        setOperations((current) => current.map((operation) => updates.find((update) => update.id === operation.id) ?? operation));
      });
    }, 3000);

    return () => window.clearInterval(interval);
  }, [operations]);

  const queueDiscovery = async () => {
    if (!agencyId || !contractId) return;
    const operation = await queueDiscoveryOperation(Number(agencyId), Number(contractId));
    setOperations((current) => [operation, ...current]);
  };

  return (
    <section className="space-y-6">
      <div><h2 className="text-2xl font-semibold">Operações</h2><p className="text-muted-foreground">Fila durável do Crawler Machine.</p></div>
      <Card>
        <CardHeader><CardTitle>Novo Discovery</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <select aria-label="Crawl Agency" className="rounded-md border bg-transparent px-3" value={agencyId} onChange={(event) => setAgencyId(event.target.value)}>
            <option value="">Selecione a Crawl Agency</option>
            {agencies.map((agency) => <option key={agency.id} value={agency.id}>{agency.name}</option>)}
          </select>
          <select aria-label="Contrato de dados" className="rounded-md border bg-transparent px-3" value={contractId} onChange={(event) => setContractId(event.target.value)}>
            <option value="">Selecione o contrato ativo</option>
            {activeContracts.map((contract) => <option key={contract.id} value={contract.id}>Versão {contract.version}</option>)}
          </select>
          <Button disabled={!agencyId || !contractId} onClick={queueDiscovery}>Enfileirar Discovery</Button>
        </CardContent>
      </Card>
      <div className="grid gap-3 md:grid-cols-3">
        {initialWorkers.map((worker) => (
          <Card key={worker.id}><CardContent className="pt-6"><p className="font-medium">{worker.worker_key}</p><p>{worker.version}</p><Badge>{worker.health_state}</Badge></CardContent></Card>
        ))}
      </div>
      <div className="space-y-3">
        {operations.map((operation) => (
          <Card key={operation.id}>
            <CardContent className="space-y-2 pt-6">
              <div className="flex items-center justify-between"><p>#{operation.id} · {operation.type}</p><Badge variant="outline">{operation.state}</Badge></div>
              <Progress value={operation.progress.percentage} />
              <p className="text-sm">{operation.progress.percentage}% · {operation.progress.stage}</p>
              {operation.discovery_snapshot_id && <Link className="text-sm underline" href={`/admin/crawler/discoveries/${operation.discovery_snapshot_id}`}>Inspecionar Snapshot de Discovery</Link>}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
