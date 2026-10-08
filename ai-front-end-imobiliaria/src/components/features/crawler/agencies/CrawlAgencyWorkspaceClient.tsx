"use client";

import { Activity, CalendarClock, Database, History, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { OperationStateBadge } from "@/components/features/crawler/CrawlerStatusBadges";
import { schedulePresetLabels } from "@/components/features/crawler/schedules/SchedulePresetFields";
import { EmptyState } from "@/components/layout/EmptyState";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type {
  CrawlAgency,
  CrawlAgencySchedule,
  CrawlerOperation,
  CrawlRun,
  DiscoveryPolicyVersion,
  DiscoverySnapshot,
  DiscoveryStrategy,
  ExtractionPolicyVersion,
  ExtractionProfile,
  OnboardingExecution,
  OnboardingExecutionModelVersion,
  OnboardingPlan,
} from "@/types/crawler";

import { isActiveCrawlerOperation, useCrawlerOperationPolling } from "../useCrawlerOperationPolling";
import { CrawlAgencyContextHeader } from "./CrawlAgencyContextHeader";
import { CrawlAgencyOnboardingProgress } from "./CrawlAgencyOnboardingProgress";
import { OnboardingExecutionSummaryCard } from "./OnboardingExecutionSummaryCard";
import { OnboardingPlanBuilder } from "./OnboardingPlanBuilder";
import { useOnboardingExecutionPolling } from "./useOnboardingExecutionPolling";

interface CrawlAgencyWorkspaceClientProps {
  agency: CrawlAgency;
  discoveryPolicies: DiscoveryPolicyVersion[];
  discoveryStrategies: DiscoveryStrategy[];
  executions: OnboardingExecution[];
  extractionPolicies: ExtractionPolicyVersion[];
  initialOperations: CrawlerOperation[];
  models: OnboardingExecutionModelVersion[];
  onboardingPlan: OnboardingPlan | null;
  profiles: ExtractionProfile[];
  runs: CrawlRun[];
  schedule: CrawlAgencySchedule;
  snapshots: DiscoverySnapshot[];
}

function readiness(agency: CrawlAgency, profiles: ExtractionProfile[], runs: CrawlRun[]) {
  if (agency.revalidation_required) {
    return {
      label: "Revalidação necessária",
      detail: "O perfil precisa ser validado antes de novas publicações.",
      href: "profiles",
      action: "Revalidar perfil",
    };
  }
  if (agency.lifecycle_state === "onboarding") {
    const candidate = profiles.find((profile) => ["candidate", "revalidation_required"].includes(profile.status));
    if (candidate) {
      return {
        label: "Aguardando validação",
        detail: `Perfil v${candidate.version} precisa passar pelo Crawl de Validação.`,
        href: "profiles",
        action: "Validar perfil",
      };
    }
    return {
      label: "Onboarding em andamento",
      detail: "Crie um Discovery e gere um Perfil de Extração Candidato.",
      href: "discoveries",
      action: "Continuar onboarding",
    };
  }
  if (!runs.some((run) => run.publication_state === "published")) {
    return {
      label: "Sem snapshot publicado",
      detail: "A fonte está ativa, mas ainda não possui dados vigentes.",
      href: "crawls",
      action: "Rodar crawl manual",
    };
  }
  return {
    label: "Apta para produção",
    detail: "Perfil e dados vigentes estão disponíveis.",
    href: "crawls",
    action: "Rodar crawl manual",
  };
}

export function CrawlAgencyWorkspaceClient({
  agency,
  discoveryPolicies,
  discoveryStrategies,
  executions: initialExecutions,
  extractionPolicies,
  initialOperations,
  models,
  onboardingPlan,
  profiles,
  runs,
  schedule,
  snapshots,
}: CrawlAgencyWorkspaceClientProps) {
  const [operations, setOperations] = useState(initialOperations);
  const [executions, setExecutions] = useState(initialExecutions);
  const activeOperation = operations.find(isActiveCrawlerOperation);
  const execution = executions[0] ?? null;
  const displayedAgency = useMemo(
    () => execution?.approval && agency.lifecycle_state === "onboarding"
      ? { ...agency, lifecycle_state: "active" as const }
      : agency,
    [agency, execution?.approval],
  );
  const publishedRun = runs.find((run) => run.publication_state === "published");
  const quarantinedRun = runs.find((run) => run.publication_state === "quarantined");
  const state = useMemo(() => readiness(displayedAgency, profiles, runs), [displayedAgency, profiles, runs]);

  useCrawlerOperationPolling({
    operations: activeOperation ? [activeOperation] : [],
    onOperation: (updated) => setOperations((current) => current.map((operation) => operation.id === updated.id ? updated : operation)),
  });
  useOnboardingExecutionPolling({
    execution,
    onExecution: (updated) => setExecutions((current) => {
      const remaining = current.filter((item) => item.id !== updated.id);
      return [updated, ...remaining];
    }),
  });

  const formatDate = (value: string | null) => value === null
    ? "—"
    : new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
  const root = `/admin/crawler/agencies/${agency.id}`;
  const recent = operations.slice(0, 5);

  return (
    <div className="space-y-6">
      <CrawlAgencyContextHeader
        agency={displayedAgency}
        area="Visão geral"
        description="Estado operacional, prontidão e atividade recente desta fonte."
      />

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">Prontidão</span>
        <Badge variant={displayedAgency.revalidation_required ? "destructive" : "outline"}>{state.label}</Badge>
      </div>

      {onboardingPlan?.status === "draft" && execution?.state !== "completed" && (
        <OnboardingPlanBuilder
          agency={agency}
          discoveryPolicies={discoveryPolicies}
          discoveryStrategies={discoveryStrategies}
          extractionPolicies={extractionPolicies}
          models={models}
          onConfirmed={(confirmed) => setExecutions((current) => [confirmed, ...current.filter((item) => item.id !== confirmed.id)])}
          plan={onboardingPlan}
          snapshots={snapshots}
        />
      )}

      {execution && <OnboardingExecutionSummaryCard agencyId={agency.id} execution={execution} />}

      {!onboardingPlan && <CrawlAgencyOnboardingProgress agency={agency} profiles={profiles} snapshots={snapshots} />}

      {!onboardingPlan && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle>Próxima ação recomendada</CardTitle>
            <CardDescription>{state.detail}</CardDescription>
            <CardAction>
              <Button asChild>
                <Link href={`${root}/${state.href}`}>{state.action}</Link>
              </Button>
            </CardAction>
          </CardHeader>
        </Card>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <Card className="gap-0 overflow-hidden py-0">
          <SectionHeader
            actions={activeOperation && <OperationStateBadge state={activeOperation.state} />}
            as="h3"
            icon={Activity}
            title="Operação atual"
          />
          {activeOperation ? (
            <div className="space-y-3 px-4 py-4 sm:px-5">
              <p className="text-sm text-foreground">#{activeOperation.id} · {activeOperation.type}</p>
              <Progress className="h-2" value={activeOperation.progress.percentage} />
              <p className="text-xs text-muted-foreground tabular-nums">
                {activeOperation.progress.stage} · {activeOperation.progress.percentage}% · {activeOperation.progress.processed}/{activeOperation.progress.total ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                {activeOperation.progress.message ?? "Aguardando atualização"} · heartbeat {formatDate(activeOperation.progress.heartbeat_at)}
              </p>
              <Link
                className="inline-block text-sm text-primary hover:underline"
                href={`/admin/crawler/operations?crawl_agency_id=${agency.id}`}
              >
                Abrir na fila global
              </Link>
            </div>
          ) : (
            <EmptyState
              description="Crawl livre para iniciar."
              icon={Activity}
              title="Nenhuma operação em andamento."
              variant="inline"
            />
          )}
        </Card>

        <Card className="gap-0 overflow-hidden py-0">
          <SectionHeader as="h3" icon={Database} title="Dados vigentes" />
          {publishedRun ? (
            <div className="space-y-1 px-4 py-4 sm:px-5">
              <Link className="text-sm text-primary hover:underline" href={`/admin/crawler/runs/${publishedRun.id}`}>
                Snapshot #{publishedRun.id} publicado
              </Link>
              <p className="text-sm text-foreground tabular-nums">{publishedRun.counts.normalized} imóveis normalizados</p>
              <p className="text-xs text-muted-foreground">Publicado em {formatDate(publishedRun.published_at)}</p>
            </div>
          ) : (
            <EmptyState icon={Database} title="Nenhum snapshot publicado." variant="inline" />
          )}
        </Card>

        <Card className="gap-0 overflow-hidden py-0">
          <SectionHeader as="h3" href={`${root}/schedule`} icon={CalendarClock} linkLabel="Ver agendamento" title="Agendamento" />
          <div className="space-y-2 px-4 py-4 sm:px-5">
            <p className="text-sm text-foreground">
              {schedulePresetLabels[schedule.effective_preset]} · {schedule.effective_timezone}
            </p>
            <p className="text-xs text-muted-foreground">Próxima execução: {formatDate(schedule.next_run_at)}</p>
            {schedule.suspended ? (
              <Badge variant="destructive">Suspenso</Badge>
            ) : (
              <Badge variant={schedule.circuit.state === "open" ? "warning" : "muted"}>
                {schedule.circuit.state === "open" ? "Circuito aberto" : "Circuito fechado"}
              </Badge>
            )}
          </div>
        </Card>
      </div>

      {(quarantinedRun || agency.revalidation_required) && (
        <Card className="gap-0 overflow-hidden py-0">
          <SectionHeader as="h3" icon={TriangleAlert} title="Precisa de atenção" />
          <ul className="divide-y">
            {agency.revalidation_required && (
              <li className="flex items-start gap-3 px-4 py-3 sm:px-5">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
                <Link className="text-sm text-foreground hover:text-primary hover:underline" href={`${root}/profiles`}>
                  Revalidação necessária: revise e valide o Perfil de Extração.
                </Link>
              </li>
            )}
            {quarantinedRun && (
              <li className="flex items-start gap-3 px-4 py-3 sm:px-5">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
                <Link
                  className="text-sm text-foreground hover:text-primary hover:underline"
                  href={`/admin/crawler/runs/${quarantinedRun.id}`}
                >
                  Snapshot #{quarantinedRun.id} está em quarentena. Revisar qualidade.
                </Link>
              </li>
            )}
          </ul>
        </Card>
      )}

      <Card className="gap-0 overflow-hidden py-0">
        <SectionHeader as="h3" description="Operações desta Crawl Agency." icon={History} title="Atividade recente" />
        {recent.length === 0 ? (
          <EmptyState icon={History} title="Nenhuma atividade registrada." variant="inline" />
        ) : (
          <ol className="divide-y">
            {recent.map((operation) => (
              <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5" key={operation.id}>
                <span className="flex min-w-0 items-center gap-3">
                  <span className="truncate text-sm text-foreground">#{operation.id} · {operation.type}</span>
                  <OperationStateBadge state={operation.state} />
                </span>
                <Link
                  className="text-sm text-primary hover:underline"
                  href={`/admin/crawler/operations?crawl_agency_id=${agency.id}`}
                >
                  Ver operação
                </Link>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
