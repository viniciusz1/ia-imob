"use client";

import { CircleAlert, ListChecks, Server } from "lucide-react";
import Link from "next/link";
import { type ChangeEvent, useEffect, useState } from "react";
import { toast } from "sonner";

import { HealthBadge, OPERATION_STATUS, OperationStateBadge } from "@/components/features/crawler/CrawlerStatusBadges";
import { EmptyState } from "@/components/layout/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { NativeSelect } from "@/components/ui/native-select";
import { Progress } from "@/components/ui/progress";
import {
  actOnOperationGroup,
  cancelCrawlerOperation,
  createOperationGroup,
  getCrawlerOperation,
  listCrawlerOperations,
  retryCrawlerOperation,
} from "@/services/crawlerService";
import type {
  CrawlAgency,
  CrawlerOperation,
  WorkerInstance,
  CrawlerOperationFilters,
} from "@/types/crawler";
import { crawlerPollInterval } from "./crawlerPolling";
import { crawlerOperationErrorMessage } from "../crawlerOperationFeedback";

interface CrawlerOperationsClientProps {
  agencies: CrawlAgency[];
  initialOperations: CrawlerOperation[];
  initialWorkers: WorkerInstance[];
  initialFilters?: CrawlerOperationFilters;
}

export function CrawlerOperationsClient({ agencies, initialOperations, initialWorkers, initialFilters = {} }: CrawlerOperationsClientProps) {
  const [operations, setOperations] = useState(initialOperations);
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

  const replaceOperation = (updated: CrawlerOperation) => {
    setOperations((current) => current.map((operation) => operation.id === updated.id ? updated : operation));
  };

  const cancel = async (id: number) => {
    try {
      replaceOperation(await cancelCrawlerOperation(id));
      toast.success(`Cancelamento da operação #${id} solicitado.`);
    } catch (error) {
      toast.error(crawlerOperationErrorMessage(error, `Não foi possível cancelar a operação #${id}.`));
    }
  };
  const retry = async (id: number) => {
    try {
      const operation = await retryCrawlerOperation(id);
      setOperations((current) => current.some((item) => item.id === operation.id) ? current : [operation, ...current]);
      toast.success(`Retentativa enfileirada como operação #${operation.id}.`);
    } catch (error) {
      toast.error(crawlerOperationErrorMessage(error, `Não foi possível retentar a operação #${id}.`));
    }
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

  const updateFilter = (key: keyof typeof filters) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { value } = event.target;
    setFilters((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <PageHeader description="Fila durável do Crawler Machine." title="Operações" />

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Filtros da fila global</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <FormField htmlFor="operation-type-filter" label="Tipo">
              <NativeSelect
                aria-label="Filtrar por tipo"
                id="operation-type-filter"
                onChange={updateFilter("type")}
                value={filters.type}
              >
                <option value="">Todos</option>
                <option value="discovery">Discovery</option>
                <option value="profile_generation">Perfil</option>
                <option value="production_crawl">Crawl de produção</option>
                <option value="prospecting">Prospecção</option>
              </NativeSelect>
            </FormField>
            <FormField htmlFor="operation-state-filter" label="Estado">
              <NativeSelect
                aria-label="Filtrar por estado"
                id="operation-state-filter"
                onChange={updateFilter("state")}
                value={filters.state}
              >
                <option value="">Todos</option>
                {(Object.keys(OPERATION_STATUS) as Array<keyof typeof OPERATION_STATUS>).map((state) => (
                  <option key={state} value={state}>{OPERATION_STATUS[state].label}</option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField htmlFor="operation-agency-filter" label="Crawl Agency">
              <NativeSelect
                aria-label="Filtrar por Crawl Agency"
                id="operation-agency-filter"
                onChange={updateFilter("crawlAgencyId")}
                value={filters.crawlAgencyId}
              >
                <option value="">Todas</option>
                {agencies.map((agency) => <option key={agency.id} value={agency.id}>{agency.name}</option>)}
              </NativeSelect>
            </FormField>
            <FormField htmlFor="operation-group-filter" label="Grupo">
              <NativeSelect
                aria-label="Filtrar por grupo"
                id="operation-group-filter"
                onChange={updateFilter("groupId")}
                value={filters.groupId}
              >
                <option value="">Todos</option>
                {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
              </NativeSelect>
            </FormField>
            <FormField htmlFor="operation-requester-filter" label="Solicitante">
              <NativeSelect
                aria-label="Filtrar por solicitante"
                id="operation-requester-filter"
                onChange={updateFilter("requestedBy")}
                value={filters.requestedBy}
              >
                <option value="">Todos</option>
                {requesters.map((requester) => <option key={requester.id} value={requester.id}>{requester.name}</option>)}
              </NativeSelect>
            </FormField>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <FormField htmlFor="operation-from-filter" label="De">
              <DatePicker
                id="operation-from-filter"
                onChange={(value) => setFilters((current) => ({ ...current, from: value }))}
                value={filters.from}
                withTime
              />
            </FormField>
            <FormField htmlFor="operation-to-filter" label="Até">
              <DatePicker
                id="operation-to-filter"
                onChange={(value) => setFilters((current) => ({ ...current, to: value }))}
                value={filters.to}
                withTime
              />
            </FormField>
            <div className="flex items-end">
              <Button onClick={() => void applyFilters()} type="button">Aplicar filtros</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {initialWorkers.length > 0 && (
        <Card className="scroll-mt-6 gap-0 overflow-hidden py-0" id="workers">
          <SectionHeader description="Instâncias que consomem a fila." icon={Server} title="Workers" />
          <div className="grid gap-4 p-4 sm:p-5 md:grid-cols-2 xl:grid-cols-3">
            {initialWorkers.map((worker) => (
              <div className="space-y-2 rounded-lg border p-4" key={worker.id}>
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate font-mono text-sm text-foreground">{worker.worker_key}</p>
                  <HealthBadge state={worker.health_state} />
                </div>
                <p className="text-xs text-muted-foreground">Versão: {worker.version}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {Object.entries(worker.capacity).map(([key, value]) => `${key}: ${value}`).join(" · ") || "Capacidade não informada"}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  Heartbeat: {new Date(worker.last_heartbeat_at).toLocaleString("pt-BR")}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {failureGroups.length > 0 && (
        <section aria-label="Grupos de falhas equivalentes" className="space-y-3">
          {failureGroups.map((group) => (
            <div
              className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm"
              key={group.key}
            >
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
              <div className="min-w-0 space-y-1">
                <h3 className="text-sm text-destructive">{group.count} falhas equivalentes</h3>
                <p className="text-muted-foreground">
                  Plano {group.key.slice(0, 12)}…; todas as ocorrências continuam listadas abaixo.
                </p>
              </div>
            </div>
          ))}
        </section>
      )}

      <div className="flex flex-wrap gap-2">
        <Button disabled={selected.length === 0} onClick={() => void batch("cancel")} size="sm" type="button" variant="outline">
          Cancelar selecionadas
        </Button>
        <Button disabled={selected.length === 0} onClick={() => void batch("retry")} size="sm" type="button" variant="outline">
          Retentar selecionadas
        </Button>
      </div>

      {operations.length === 0 ? (
        <EmptyState icon={ListChecks} title="Nenhuma operação encontrada." />
      ) : (
        <div className="space-y-4">
          {operations.map((operation) => (
            <Card className="scroll-mt-6 gap-4" id={`operation-${operation.id}`} key={operation.id}>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Checkbox
                      aria-label={`Selecionar operação ${operation.id}`}
                      checked={selected.includes(operation.id)}
                      onCheckedChange={(checked) => setSelected((current) => checked === true ? [...current, operation.id] : current.filter((id) => id !== operation.id))}
                    />
                    <p className="truncate text-sm text-foreground tabular-nums">#{operation.id} · {operation.type}</p>
                  </div>
                  <OperationStateBadge state={operation.state} />
                </div>
                <div className="space-y-1.5">
                  <Progress className="h-1.5" value={operation.progress.percentage} />
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {operation.progress.percentage}% · {operation.progress.stage}
                  </p>
                </div>
                {operation.timeline && (
                  <ol aria-label={`Timeline da operação ${operation.id}`} className="flex flex-wrap gap-2">
                    {operation.timeline.map((item) => (
                      <li
                        className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground data-[status=current]:bg-primary/10 data-[status=current]:text-primary"
                        data-status={item.status}
                        key={item.stage}
                      >
                        {item.stage}
                      </li>
                    ))}
                  </ol>
                )}
                {(operation.discovery_snapshot_id || typeof operation.result?.crawl_run_id === "number") && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {operation.discovery_snapshot_id && (
                      <Link className="text-primary hover:underline" href={`/admin/crawler/discoveries/${operation.discovery_snapshot_id}`}>
                        Inspecionar Snapshot de Discovery
                      </Link>
                    )}
                    {typeof operation.result?.crawl_run_id === "number" && (
                      <Link className="text-primary hover:underline" href={`/admin/crawler/runs/${operation.result.crawl_run_id}`}>
                        Visualizar dados do crawl
                      </Link>
                    )}
                  </div>
                )}
                {(["queued", "running", "cancellation_requested", "failed", "cancelled"].includes(operation.state)) && (
                  <div className="flex flex-wrap gap-2">
                    {["queued", "running", "cancellation_requested"].includes(operation.state) && (
                      <Button onClick={() => void cancel(operation.id)} size="sm" type="button" variant="outline">Cancelar</Button>
                    )}
                    {["failed", "cancelled"].includes(operation.state) && (
                      <Button onClick={() => void retry(operation.id)} size="sm" type="button" variant="outline">Retentar</Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
