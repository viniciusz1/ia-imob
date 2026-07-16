"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  actOnOperationGroup,
  cancelCrawlerOperation,
  createOperationGroup,
  getCrawlerOperation,
  listCrawlerOperations,
  queueDiscoveryOperation,
  retryCrawlerOperation,
} from "@/services/crawlerService";
import type {
  CrawlAgency,
  CrawlerOperation,
  MarketDataContract,
  WorkerInstance,
  CrawlerOperationFilters,
} from "@/types/crawler";
import { crawlerPollInterval } from "./crawlerPolling";

interface CrawlerOperationsClientProps {
  agencies: CrawlAgency[];
  contracts: MarketDataContract[];
  initialOperations: CrawlerOperation[];
  initialWorkers: WorkerInstance[];
  initialFilters?: CrawlerOperationFilters;
}

export function CrawlerOperationsClient({ agencies, contracts, initialOperations, initialWorkers, initialFilters = {} }: CrawlerOperationsClientProps) {
  const [operations, setOperations] = useState(initialOperations);
  const [agencyId, setAgencyId] = useState(agencies[0]?.id.toString() ?? "");
  const activeContracts = contracts.filter((contract) => contract.status === "active");
  const [contractId, setContractId] = useState(activeContracts[0]?.id.toString() ?? "");
  const [selected, setSelected] = useState<number[]>([]);
  const [filters, setFilters] = useState({
    type: initialFilters.type ?? "",
    state: initialFilters.state ?? "",
    crawlAgencyId: initialFilters.crawl_agency_id?.toString() ?? "",
    groupId: initialFilters.group_id?.toString() ?? "",
    requestedBy: initialFilters.requested_by?.toString() ?? "",
    from: initialFilters.from ?? "",
    to: initialFilters.to ?? "",
  });

  useEffect(() => {
    const activeIds = operations.filter((operation) => ["queued", "running", "cancellation_requested"].includes(operation.state)).map((operation) => operation.id);
    if (activeIds.length === 0) return;

    let timeout: number | undefined;
    const poll = () => {
      void Promise.all(activeIds.map(getCrawlerOperation)).then((updates) => {
        setOperations((current) => current.map((operation) => updates.find((update) => update.id === operation.id) ?? operation));
      });
    };
    const schedule = () => {
      if (timeout !== undefined) window.clearInterval(timeout);
      timeout = window.setInterval(poll, crawlerPollInterval(document.visibilityState));
    };
    schedule();
    document.addEventListener("visibilitychange", schedule);

    return () => {
      if (timeout !== undefined) window.clearInterval(timeout);
      document.removeEventListener("visibilitychange", schedule);
    };
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
  const failureGroups = Object.entries(failedEquivalents)
    .map(([key, localCount]) => ({
      key,
      count: Math.max(localCount, ...operations.filter((operation) => operation.equivalence_key === key).map((operation) => operation.equivalent_failure_count ?? 0)),
    }))
    .filter((group) => group.count > 1);
  const groups = Array.from(new Map(operations.flatMap((operation) => operation.groups ?? []).map((group) => [group.id, group])).values());
  const requesters = Array.from(new Map(operations.flatMap((operation) => operation.requester ? [operation.requester] : []).map((requester) => [requester.id, requester])).values());

  const applyFilters = async () => {
    const nextFilters: CrawlerOperationFilters = {
      ...(filters.type && { type: filters.type }),
      ...(filters.state && { state: filters.state as CrawlerOperationFilters["state"] }),
      ...(filters.crawlAgencyId && { crawl_agency_id: Number(filters.crawlAgencyId) }),
      ...(filters.groupId && { group_id: Number(filters.groupId) }),
      ...(filters.requestedBy && { requested_by: Number(filters.requestedBy) }),
      ...(filters.from && { from: filters.from }),
      ...(filters.to && { to: filters.to }),
    };
    setOperations(await listCrawlerOperations(nextFilters));
    setSelected([]);
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
      <Card>
        <CardHeader><CardTitle>Filtros da fila global</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
          <div><Label htmlFor="operation-type-filter">Tipo</Label><select aria-label="Filtrar por tipo" className="h-9 w-full rounded-md border bg-transparent px-3" id="operation-type-filter" onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))} value={filters.type}><option value="">Todos</option><option value="discovery">Discovery</option><option value="profile_generation">Perfil</option><option value="production_crawl">Crawl de produção</option><option value="prospecting">Prospecção</option></select></div>
          <div><Label htmlFor="operation-state-filter">Estado</Label><select aria-label="Filtrar por estado" className="h-9 w-full rounded-md border bg-transparent px-3" id="operation-state-filter" onChange={(event) => setFilters((current) => ({ ...current, state: event.target.value }))} value={filters.state}><option value="">Todos</option>{["queued", "running", "cancellation_requested", "succeeded", "failed", "cancelled"].map((state) => <option key={state} value={state}>{state}</option>)}</select></div>
          <div><Label htmlFor="operation-agency-filter">Crawl Agency</Label><select aria-label="Filtrar por Crawl Agency" className="h-9 w-full rounded-md border bg-transparent px-3" id="operation-agency-filter" onChange={(event) => setFilters((current) => ({ ...current, crawlAgencyId: event.target.value }))} value={filters.crawlAgencyId}><option value="">Todas</option>{agencies.map((agency) => <option key={agency.id} value={agency.id}>{agency.name}</option>)}</select></div>
          <div><Label htmlFor="operation-group-filter">Grupo</Label><select aria-label="Filtrar por grupo" className="h-9 w-full rounded-md border bg-transparent px-3" id="operation-group-filter" onChange={(event) => setFilters((current) => ({ ...current, groupId: event.target.value }))} value={filters.groupId}><option value="">Todos</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></div>
          <div><Label htmlFor="operation-requester-filter">Solicitante</Label><select aria-label="Filtrar por solicitante" className="h-9 w-full rounded-md border bg-transparent px-3" id="operation-requester-filter" onChange={(event) => setFilters((current) => ({ ...current, requestedBy: event.target.value }))} value={filters.requestedBy}><option value="">Todos</option>{requesters.map((requester) => <option key={requester.id} value={requester.id}>{requester.name}</option>)}</select></div>
          <div><Label htmlFor="operation-from-filter">De</Label><Input id="operation-from-filter" onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} type="datetime-local" value={filters.from} /></div>
          <div><Label htmlFor="operation-to-filter">Até</Label><Input id="operation-to-filter" onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} type="datetime-local" value={filters.to} /></div>
          <div className="flex items-end"><Button onClick={() => void applyFilters()} type="button">Aplicar filtros</Button></div>
        </CardContent>
      </Card>
      <div className="grid gap-3 md:grid-cols-3" id="workers">
        {initialWorkers.map((worker) => (
          <Card key={worker.id}><CardContent className="space-y-1 pt-6"><p className="font-medium">{worker.worker_key}</p><p>Versão: {worker.version}</p><Badge>{worker.health_state}</Badge><p className="text-sm">{Object.entries(worker.capacity).map(([key, value]) => `${key}: ${value}`).join(" · ") || "Capacidade não informada"}</p><p className="text-sm">Heartbeat: {new Date(worker.last_heartbeat_at).toLocaleString("pt-BR")}</p></CardContent></Card>
        ))}
      </div>
      {failureGroups.length > 0 && <section aria-label="Grupos de falhas equivalentes" className="space-y-2">
        {failureGroups.map((group) => <Card key={group.key}><CardContent className="pt-6"><h3 className="font-semibold">{group.count} falhas equivalentes</h3><p className="text-sm text-muted-foreground">Plano {group.key.slice(0, 12)}…; todas as ocorrências continuam listadas abaixo.</p></CardContent></Card>)}
      </section>}
      <div className="flex gap-2">
        <Button disabled={selected.length === 0} onClick={() => void batch("cancel")} type="button" variant="outline">Cancelar selecionadas</Button>
        <Button disabled={selected.length === 0} onClick={() => void batch("retry")} type="button" variant="outline">Retentar selecionadas</Button>
      </div>
      <div className="space-y-3">
        {operations.length === 0 && <Card><CardContent className="pt-6">Nenhuma operação encontrada.</CardContent></Card>}
        {operations.map((operation) => (
          <Card key={operation.id}>
            <CardContent className="space-y-2 pt-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2"><Checkbox aria-label={`Selecionar operação ${operation.id}`} checked={selected.includes(operation.id)} onCheckedChange={(checked) => setSelected((current) => checked === true ? [...current, operation.id] : current.filter((id) => id !== operation.id))} /><p>#{operation.id} · {operation.type}</p></div>
                <Badge variant="outline">{operation.state}</Badge>
              </div>
              <Progress value={operation.progress.percentage} />
              <p className="text-sm">{operation.progress.percentage}% · {operation.progress.stage}</p>
              {operation.timeline && <ol aria-label={`Timeline da operação ${operation.id}`} className="flex flex-wrap gap-2 text-xs">
                {operation.timeline.map((item) => <li className="rounded border px-2 py-1" data-status={item.status} key={item.stage}>{item.stage}</li>)}
              </ol>}
              {operation.discovery_snapshot_id && <Link className="text-sm underline" href={`/admin/crawler/discoveries/${operation.discovery_snapshot_id}`}>Inspecionar Snapshot de Discovery</Link>}
              {typeof operation.result?.crawl_run_id === "number" && <Link className="text-sm underline" href={`/admin/crawler/runs/${operation.result.crawl_run_id}`}>Visualizar dados do crawl</Link>}
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
