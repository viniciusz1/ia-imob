"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  actOnOperationGroup,
  cancelCrawlerOperation,
  createOperationGroup,
  getCrawlerOperation,
  queueDiscoveryOperation,
  retryCrawlerOperation,
} from "@/services/crawlerService";
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
  const [selected, setSelected] = useState<number[]>([]);

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

  const replaceOperation = (updated: CrawlerOperation) => {
    setOperations((current) => current.map((operation) => operation.id === updated.id ? updated : operation));
  };

  const cancel = async (id: number) => replaceOperation(await cancelCrawlerOperation(id));
  const retry = async (id: number) => {
    const operation = await retryCrawlerOperation(id);
    setOperations((current) => current.some((item) => item.id === operation.id) ? current : [operation, ...current]);
  };
  const batch = async (action: "cancel" | "retry") => {
    const eligible = operations.filter((operation) => selected.includes(operation.id) && (
      action === "cancel"
        ? ["queued", "running", "cancellation_requested"].includes(operation.state)
        : ["failed", "cancelled"].includes(operation.state)
    ));
    if (eligible.length === 0) return;
    const group = await createOperationGroup(`${action} selecionado`, eligible.map((operation) => operation.id));
    const result = await actOnOperationGroup(group.id, action, eligible.map((operation) => operation.id));
    if (action === "retry") {
      setOperations((current) => [...result.operations.filter((operation) => !current.some((item) => item.id === operation.id)), ...current]);
    } else {
      setOperations((current) => current.map((operation) => result.operations.find((item) => item.id === operation.id) ?? operation));
    }
    setSelected([]);
  };

  const failedEquivalents = operations.reduce<Record<string, number>>((counts, operation) => {
    if (operation.state === "failed" && operation.equivalence_key) counts[operation.equivalence_key] = (counts[operation.equivalence_key] ?? 0) + 1;
    return counts;
  }, {});

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
      <div className="flex gap-2">
        <Button disabled={selected.length === 0} onClick={() => void batch("cancel")} type="button" variant="outline">Cancelar selecionadas</Button>
        <Button disabled={selected.length === 0} onClick={() => void batch("retry")} type="button" variant="outline">Retentar selecionadas</Button>
      </div>
      <div className="space-y-3">
        {operations.map((operation) => (
          <Card key={operation.id}>
            <CardContent className="space-y-2 pt-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2"><Checkbox aria-label={`Selecionar operação ${operation.id}`} checked={selected.includes(operation.id)} onCheckedChange={(checked) => setSelected((current) => checked === true ? [...current, operation.id] : current.filter((id) => id !== operation.id))} /><p>#{operation.id} · {operation.type}</p></div>
                <Badge variant="outline">{operation.state}</Badge>
              </div>
              <Progress value={operation.progress.percentage} />
              <p className="text-sm">{operation.progress.percentage}% · {operation.progress.stage}</p>
              {operation.discovery_snapshot_id && <Link className="text-sm underline" href={`/admin/crawler/discoveries/${operation.discovery_snapshot_id}`}>Inspecionar Snapshot de Discovery</Link>}
              {typeof operation.result?.crawl_run_id === "number" && <Link className="text-sm underline" href={`/admin/crawler/runs/${operation.result.crawl_run_id}`}>Visualizar dados do crawl</Link>}
              {operation.state === "failed" && operation.equivalence_key && (failedEquivalents[operation.equivalence_key] ?? 0) > 1 && <p className="text-sm">{failedEquivalents[operation.equivalence_key]} falhas equivalentes</p>}
              <div className="flex gap-2">
                {["queued", "running", "cancellation_requested"].includes(operation.state) && <Button onClick={() => void cancel(operation.id)} size="sm" type="button" variant="outline">Cancelar</Button>}
                {["failed", "cancelled"].includes(operation.state) && <Button onClick={() => void retry(operation.id)} size="sm" type="button" variant="outline">Retentar</Button>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
