"use client";

import {
  AlertTriangle,
  Check,
  ChevronDown,
  CircleCheck,
  CircleDot,
  Clock,
  Info,
  RotateCcw,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { usePermission } from "@/hooks/usePermission";
import { cn } from "@/lib/utils";
import {
  actOnboardingExecution,
  approveOnboardingExecution,
  getOnboardingExecution,
  retryCrawlerOperation,
  saveOnboardingPointConfiguration,
  startOnboardingFirstProduction,
} from "@/services/crawlerService";
import type {
  FirstProductionDiscoveryMode,
  OnboardingExecution,
  OnboardingExecutionAction,
  OnboardingExecutionOperation,
  OnboardingExecutionStepKey,
} from "@/types/crawler";

import { OperationStateBadge } from "../CrawlerStatusBadges";
import { crawlerOperationErrorMessage } from "../crawlerOperationFeedback";
import { OnboardingDiscoveryRecovery } from "./OnboardingDiscoveryRecovery";

const STEP_LABELS: Record<OnboardingExecutionStepKey, string> = {
  discovery: "Discovery",
  sample_url_confirmation: "Confirmação da URL de Amostra",
  profile_generation: "Geração do Perfil de Extração",
  profile_validation: "Crawl de Validação",
  approval: "Aprovação humana",
  first_production: "Primeira produção",
  quality_gate: "Quality Gate e publicação",
};

const STATE_LABELS: Record<OnboardingExecution["state"], string> = {
  queued: "Preparando próxima etapa",
  running: "Operação em andamento",
  awaiting_manual_step: "Aguardando comando manual",
  requires_attention: "Requer atenção",
  awaiting_approval: "Aguardando aprovação",
  awaiting_first_production: "Aguardando primeira produção",
  completed: "Onboarding concluído",
  cancelled: "Execução cancelada",
};

const STATE_BADGE_VARIANTS: Record<OnboardingExecution["state"], "success" | "warning" | "info" | "destructive" | "muted"> = {
  queued: "muted",
  running: "info",
  awaiting_manual_step: "warning",
  requires_attention: "destructive",
  awaiting_approval: "warning",
  awaiting_first_production: "warning",
  completed: "success",
  cancelled: "muted",
};

const MANUAL_ACTIONS: Partial<Record<OnboardingExecutionAction, string>> = {
  run_discovery: "Executar Discovery",
  confirm_sample_url: "Confirmar URL e continuar",
  run_profile_generation: "Gerar Perfil de Extração",
  run_profile_validation: "Executar Crawl de Validação",
  correct_sample_url: "Corrigir URL e gerar nova tentativa",
};

const STEP_STATE_LABELS: Record<string, string> = {
  pending: "Pendente",
  queued: "Na fila",
  running: "Em andamento",
  completed: "Concluída",
  succeeded: "Concluída",
  failed: "Falhou",
  cancelled: "Cancelada",
  awaiting_approval: "Aguardando aprovação",
  awaiting_first_production: "Aguardando início",
  requires_attention: "Requer atenção",
  published: "Publicada",
  quarantined: "Em quarentena",
};

interface OnboardingExecutionTimelineProps {
  execution: OnboardingExecution;
  history: OnboardingExecution[];
  onExecution: (execution: OnboardingExecution) => void;
}

function stepIcon(state: string) {
  if (["completed", "succeeded", "published"].includes(state)) return <Check className="size-4" />;
  if (["failed", "requires_attention", "quarantined"].includes(state)) return <AlertTriangle className="size-4" />;
  if (state === "cancelled") return <X className="size-4" />;
  if (["running", "queued", "awaiting_approval", "awaiting_first_production"].includes(state)) return <CircleDot className="size-4" />;
  return <Clock className="size-4" />;
}

function stepStyle(state: string) {
  if (["completed", "succeeded", "published"].includes(state)) return "border-success bg-success text-success-foreground";
  if (["failed", "requires_attention", "quarantined"].includes(state)) return "border-destructive bg-destructive text-white";
  if (["running", "queued", "awaiting_approval", "awaiting_first_production"].includes(state)) return "border-primary bg-primary text-primary-foreground";
  return "border-border bg-card text-muted-foreground";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function stateMessage(execution: OnboardingExecution) {
  if (execution.state === "awaiting_approval") {
    return "A validação terminou. Revise o resultado e aprove explicitamente; nenhuma produção foi iniciada.";
  }
  if (execution.state === "awaiting_first_production") {
    return "Configuração aprovada e ativada. A primeira produção manual ainda não foi iniciada.";
  }
  if (execution.state === "requires_attention") {
    return execution.attention?.message ?? "A etapa atual falhou. Revise a tentativa e use a única retentativa indicada.";
  }
  if (execution.state === "completed") {
    return execution.first_production?.publication_state === "quarantined"
      ? "A primeira produção terminou em quarentena e o onboarding foi encerrado com o resultado preservado."
      : "A primeira produção passou pelo Quality Gate e o snapshot foi publicado.";
  }
  if (execution.state === "awaiting_manual_step") {
    return "A etapa anterior terminou. A execução está pausada sem ocupar worker até seu próximo comando.";
  }
  if (execution.state === "running") return "Uma Operação do Crawler filha está processando a etapa atual.";
  if (execution.state === "queued") return "O coordenador retomará esta execução e criará somente a próxima operação necessária.";
  return "Esta execução foi cancelada; tentativas e resultados anteriores continuam preservados.";
}

function OperationAttempt({ execution, operation }: { execution: OnboardingExecution; operation: OnboardingExecutionOperation }) {
  const snapshotId = typeof operation.result?.discovery_snapshot_id === "number"
    ? operation.result.discovery_snapshot_id
    : null;
  const runId = typeof operation.result?.crawl_run_id === "number"
    ? operation.result.crawl_run_id
    : null;
  const profileId = typeof operation.result?.extraction_profile_id === "number"
    ? operation.result.extraction_profile_id
    : null;
  const detailHref = `/admin/crawler/operations?crawl_agency_id=${execution.crawl_agency_id}#operation-${operation.id}`;

  const linkClassName = "text-primary hover:underline";

  return (
    <li className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-foreground">Tentativa {operation.attempt} · Operação #{operation.id}</p>
        <OperationStateBadge state={operation.state} />
      </div>
      <div className="space-y-1.5">
        <Progress className="h-2" value={operation.progress.percentage} />
        <p className="text-xs text-muted-foreground tabular-nums">
          {operation.progress.stage} · {operation.progress.percentage}%
          {operation.progress.message ? ` · ${operation.progress.message}` : ""}
        </p>
      </div>
      {operation.retry_of_operation_id && (
        <p className="text-xs text-muted-foreground">Retentativa da operação #{operation.retry_of_operation_id}</p>
      )}
      {operation.error && (
        <details className="group text-sm">
          <summary className="flex cursor-pointer list-none items-center gap-1 text-muted-foreground hover:text-foreground marker:content-none">
            <ChevronDown aria-hidden="true" className="size-3.5 transition-transform group-open:rotate-180" />
            Ver detalhes técnicos
          </summary>
          <p className="mt-2 rounded-lg bg-muted p-3 font-mono text-xs break-words text-destructive">
            {operation.error.code}: {operation.error.message}
          </p>
        </details>
      )}
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <Link className={linkClassName} href="/admin/crawler/operations">Abrir fila global</Link>
        <Link className={linkClassName} href={detailHref}>Ver detalhes da operação</Link>
        {snapshotId && (
          <Link className={linkClassName} href={`/admin/crawler/discoveries/${snapshotId}`}>Ver Snapshot de Discovery</Link>
        )}
        {runId && <Link className={linkClassName} href={`/admin/crawler/runs/${runId}`}>Ver dados do crawl</Link>}
        {profileId && (
          <Link className={linkClassName} href={`/admin/crawler/agencies/${execution.crawl_agency_id}/profiles`}>
            Ver Perfil #{profileId}
          </Link>
        )}
      </div>
    </li>
  );
}

export function OnboardingExecutionTimeline({
  execution,
  history,
  onExecution,
}: OnboardingExecutionTimelineProps) {
  const canExecute = usePermission("crawler.operations.execute");
  const canApprove = usePermission(["crawler.profiles.approve", "crawler.agencies.activate"], "all");
  const canManagePolicies = usePermission("crawler.policies.manage");
  const [sampleUrl, setSampleUrl] = useState(execution.sample_url ?? "");
  const [approvalReason, setApprovalReason] = useState("");
  const [discoveryPolicyName, setDiscoveryPolicyName] = useState(`${execution.name} — Discovery`);
  const [discoveryPolicyConfirmed, setDiscoveryPolicyConfirmed] = useState(false);
  const [productionMode, setProductionMode] = useState<FirstProductionDiscoveryMode>(
    execution.first_production_discovery_mode,
  );
  const [showDiscoveryConfiguration, setShowDiscoveryConfiguration] = useState(false);
  const [pending, setPending] = useState(false);
  const operationsByStep = useMemo(
    () => execution.operations.reduce<Partial<Record<OnboardingExecutionStepKey, OnboardingExecutionOperation[]>>>(
      (groups, operation) => ({
        ...groups,
        [operation.step]: [...(groups[operation.step] ?? []), operation],
      }),
      {},
    ),
    [execution.operations],
  );

  useEffect(() => {
    setSampleUrl(execution.sample_url ?? "");
  }, [execution.sample_url]);

  useEffect(() => {
    setProductionMode(execution.first_production_discovery_mode);
  }, [execution.first_production_discovery_mode]);

  const run = async (action: () => Promise<OnboardingExecution>, success: string) => {
    setPending(true);
    try {
      const updated = await action();
      onExecution(updated);
      toast.success(success);
    } catch (error: unknown) {
      toast.error(crawlerOperationErrorMessage(error, "Não foi possível executar a próxima ação."));
    } finally {
      setPending(false);
    }
  };

  const runManualAction = (action: OnboardingExecutionAction) => {
    const needsUrl = action === "confirm_sample_url" || action === "correct_sample_url";
    if (needsUrl && !sampleUrl.trim()) {
      toast.error("Informe uma URL de Amostra.");
      return;
    }
    void run(
      () => actOnboardingExecution(execution.id, action, needsUrl ? sampleUrl.trim() : undefined),
      "Etapa atualizada.",
    );
  };

  const retryFailedOperation = () => {
    const failed = [...execution.operations]
      .reverse()
      .find((operation) => operation.step === execution.current_step && operation.state === "failed");
    if (!failed) {
      toast.error("A operação que deve ser retomada não foi encontrada.");
      return;
    }
    setPending(true);
    void retryCrawlerOperation(failed.id)
      .then(() => getOnboardingExecution(execution.id))
      .then((updated) => {
        onExecution(updated);
        toast.success(`Nova tentativa criada para a operação #${failed.id}.`);
      })
      .catch((error: unknown) => toast.error(crawlerOperationErrorMessage(error, "Não foi possível criar a retentativa.")))
      .finally(() => setPending(false));
  };

  const action = execution.next_action;
  const retryRecovery = execution.recovery_actions.find(
    (recoveryAction) => recoveryAction.key === "retry_failed_operation",
  );
  const reviewConfigurationRecovery = execution.recovery_actions.find(
    (recoveryAction) => recoveryAction.key === "review_configuration",
  );
  const useExistingDiscoveryRecovery = execution.recovery_actions.find(
    (recoveryAction) => recoveryAction.key === "use_existing_discovery_snapshot",
  );
  const createCustomDiscoveryRecovery = execution.recovery_actions.find(
    (recoveryAction) => recoveryAction.key === "create_custom_discovery",
  );
  const needsDiscoveryPolicy = action === "decide_onboarding"
    && execution.discovery_policy_version_id === null
    && execution.resolved_configuration.discovery_policy.source === "point_configuration";
  const manualAction = action !== null && action in MANUAL_ACTIONS
    ? action as OnboardingExecutionAction
    : null;
  const canShowMutation = needsDiscoveryPolicy
    ? canManagePolicies
    : action === "decide_onboarding" ? canApprove : canExecute;

  const saveDiscoveryPolicy = () => {
    if (!discoveryPolicyName.trim() || !discoveryPolicyConfirmed) return;
    setPending(true);
    void saveOnboardingPointConfiguration(
      execution.crawl_agency_id,
      "discovery",
      discoveryPolicyName.trim(),
    )
      .then(() => getOnboardingExecution(execution.id))
      .then((updated) => {
        onExecution(updated);
        setDiscoveryPolicyConfirmed(false);
        toast.success("Nova política ativa criada e vinculada explicitamente. A aprovação continua sendo a próxima decisão.");
      })
      .catch((error: unknown) => toast.error(crawlerOperationErrorMessage(error, "Não foi possível salvar a política de Discovery.")))
      .finally(() => setPending(false));
  };

  const requiresAttention = execution.state === "requires_attention";
  const adoption = execution.discovery_adoption;
  const discoveryPolicy = execution.resolved_configuration.discovery_policy;

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>{execution.name}</CardTitle>
        <CardDescription>
          Execução de Onboarding #{execution.id} · {execution.conduction === "automated" ? "automatizada" : "manual"}
        </CardDescription>
        <CardAction>
          <Badge variant={STATE_BADGE_VARIANTS[execution.state]}>{STATE_LABELS[execution.state]}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-6">
        <section
          className={cn(
            "flex items-start gap-3 rounded-lg border px-4 py-3 text-sm",
            requiresAttention ? "border-destructive/30 bg-destructive/5" : "border-primary/20 bg-primary/5",
          )}
        >
          {requiresAttention ? (
            <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-destructive" />
          ) : (
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
          )}
          <div className="min-w-0 space-y-1">
            <p className="text-foreground">Etapa atual: {STEP_LABELS[execution.current_step]}</p>
            <p className="text-muted-foreground">{stateMessage(execution)}</p>
          </div>
        </section>

        {adoption && (
          <section
            aria-label="Auditoria da adoção do Discovery"
            className="space-y-3 rounded-lg border border-success/30 bg-success/10 p-4"
          >
            <div className="flex items-start gap-3">
              <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
              <div className="min-w-0 space-y-1">
                <h3 className="text-sm text-foreground">Discovery adotado para continuar</h3>
                <p className="text-sm text-foreground">
                  Snapshot #{adoption.discovery_snapshot_id} · Operação independente #{adoption.source_operation_id}
                </p>
                <p className="text-sm text-muted-foreground">
                  Este resultado substituiu o resultado da Operação #{adoption.replaced_operation_id}; a tentativa original permanece preservada.
                </p>
                <p className="text-xs text-muted-foreground">
                  Adotado por {adoption.adopted_by?.name ?? "operador não identificado"} em {formatDateTime(adoption.adopted_at)}.
                </p>
              </div>
            </div>
            {adoption.note && (
              <p className="rounded-lg border bg-card px-3 py-2 text-sm">{adoption.note}</p>
            )}
            <details className="group text-sm">
              <summary className="flex cursor-pointer list-none items-center gap-1 text-muted-foreground hover:text-foreground marker:content-none">
                <ChevronDown aria-hidden="true" className="size-3.5 transition-transform group-open:rotate-180" />
                Ver configuração original do Discovery
              </summary>
              <dl className="mt-2 space-y-1 text-xs">
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">Política:</dt>
                  <dd>{adoption.original_discovery_configuration.name}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">Fontes:</dt>
                  <dd>{adoption.original_discovery_configuration.strategies.join(", ") || "Nenhuma"}</dd>
                </div>
              </dl>
            </details>
          </section>
        )}

        <ol aria-label="Timeline da Execução de Onboarding">
          {execution.steps.map((step, index) => {
            const attempts = operationsByStep[step.key] ?? [];
            const isLast = index === execution.steps.length - 1;

            return (
              <li className={cn("relative flex gap-4", !isLast && "pb-6")} key={step.key}>
                {!isLast && (
                  <span aria-hidden="true" className="absolute top-10 bottom-1 left-[1.125rem] w-px bg-border" />
                )}
                <span
                  className={cn(
                    "relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full border",
                    stepStyle(step.state),
                  )}
                >
                  {stepIcon(step.state)}
                </span>
                <div className="min-w-0 flex-1 space-y-3 pt-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm text-foreground">{index + 1}. {STEP_LABELS[step.key]}</p>
                      <p className="text-xs text-muted-foreground">
                        {STEP_STATE_LABELS[step.state] ?? step.state}
                        {step.attempt ? ` · tentativa ${step.attempt}` : ""}
                      </p>
                    </div>
                    {step.operation_id && (
                      <Badge className="tabular-nums" variant="muted">Operação #{step.operation_id}</Badge>
                    )}
                  </div>
                  {attempts.length > 0 && (
                    <ol aria-label={`Tentativas de ${STEP_LABELS[step.key]}`} className="space-y-2">
                      {attempts.map((operation) => (
                        <OperationAttempt execution={execution} key={operation.id} operation={operation} />
                      ))}
                    </ol>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        {action !== null && (
          <section
            aria-label="Próxima ação da Execução de Onboarding"
            className="space-y-4 rounded-lg border border-primary/20 bg-primary/5 p-4"
          >
            <div className="space-y-1">
              <h3 className="text-base text-foreground">Próxima ação</h3>
              {!canShowMutation && !["wait_for_coordinator", "wait_for_current_operation", "review_attention"].includes(action) && (
                <p className="text-sm text-muted-foreground">
                  Somente leitura: a ação necessária não está disponível para suas permissões.
                </p>
              )}
            </div>

            {["wait_for_coordinator", "wait_for_current_operation"].includes(action) && (
              <p className="text-sm text-muted-foreground">Acompanhar o progresso. A tela será atualizada automaticamente.</p>
            )}

            {action === "review_attention" && (
              <p className="text-sm text-muted-foreground">
                Revise a mensagem e as tentativas preservadas antes de decidir como corrigir a configuração.
              </p>
            )}

            {reviewConfigurationRecovery?.enabled && canExecute && (
              <div className="space-y-3">
                <Button disabled={pending} onClick={() => setShowDiscoveryConfiguration((visible) => !visible)} type="button">
                  Revisar configuração fixada
                </Button>
                <p className="text-sm text-muted-foreground">{reviewConfigurationRecovery.reason}</p>
                {showDiscoveryConfiguration && (
                  <section aria-label="Configuração fixada do Discovery" className="rounded-lg border bg-card">
                    <dl className="divide-y text-sm">
                      <div className="flex justify-between gap-4 px-4 py-3">
                        <dt className="text-muted-foreground">Política</dt>
                        <dd className="text-right text-foreground">{discoveryPolicy.name}</dd>
                      </div>
                      <div className="flex justify-between gap-4 px-4 py-3">
                        <dt className="text-muted-foreground">Versão</dt>
                        <dd className="text-right text-foreground tabular-nums">{discoveryPolicy.version ?? "pontual"}</dd>
                      </div>
                      <div className="flex justify-between gap-4 px-4 py-3">
                        <dt className="text-muted-foreground">Fontes</dt>
                        <dd className="break-all text-right text-foreground">
                          {discoveryPolicy.strategies.join(", ") || "Nenhuma"}
                        </dd>
                      </div>
                    </dl>
                  </section>
                )}
              </div>
            )}

            {manualAction && canExecute && (
              <>
                {["confirm_sample_url", "correct_sample_url"].includes(manualAction) && (
                  <FormField htmlFor="onboarding-sample-url" label="URL de Amostra">
                    <Input
                      disabled={pending}
                      id="onboarding-sample-url"
                      onChange={(event) => setSampleUrl(event.target.value)}
                      type="url"
                      value={sampleUrl}
                    />
                  </FormField>
                )}
                <Button disabled={pending} onClick={() => runManualAction(manualAction)} type="button">
                  {MANUAL_ACTIONS[manualAction]}
                </Button>
              </>
            )}

            {needsDiscoveryPolicy && canManagePolicies && (
              <>
                <p className="text-sm text-muted-foreground">
                  O Discovery usou uma Configuração Pontual. Antes da aprovação, crie explicitamente a versão que poderá ser ativada para a agência.
                </p>
                <FormField htmlFor="approval-discovery-policy-name" label="Nome da nova Política de Discovery">
                  <Input
                    disabled={pending}
                    id="approval-discovery-policy-name"
                    onChange={(event) => setDiscoveryPolicyName(event.target.value)}
                    value={discoveryPolicyName}
                  />
                </FormField>
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={discoveryPolicyConfirmed}
                    disabled={pending}
                    id="confirm-approval-discovery-policy"
                    onCheckedChange={(checked) => setDiscoveryPolicyConfirmed(checked === true)}
                  />
                  <Label className="leading-snug" htmlFor="confirm-approval-discovery-policy">
                    Confirmo a criação desta nova política ativa. Nenhuma política existente será sobrescrita.
                  </Label>
                </div>
                <Button
                  disabled={pending || !discoveryPolicyName.trim() || !discoveryPolicyConfirmed}
                  onClick={saveDiscoveryPolicy}
                  type="button"
                >
                  Salvar como nova política ativa
                </Button>
              </>
            )}

            {action === "decide_onboarding" && !needsDiscoveryPolicy && canApprove && (
              <>
                <FormField htmlFor="onboarding-approval-reason" label="Justificativa da aprovação">
                  <Textarea
                    disabled={pending}
                    id="onboarding-approval-reason"
                    onChange={(event) => setApprovalReason(event.target.value)}
                    placeholder="Obrigatória quando a validação tiver bloqueios."
                    value={approvalReason}
                  />
                </FormField>
                <Button
                  disabled={pending}
                  onClick={() => void run(
                    () => approveOnboardingExecution(execution.id, approvalReason),
                    "Onboarding aprovado. O restante do fluxo pode continuar.",
                  )}
                  type="button"
                >
                  Aprovar e continuar
                </Button>
              </>
            )}

            {["start_first_production", "retry_first_production"].includes(action) && canExecute && (
              <>
                <FormField
                  hint="Uma mudança aqui vale somente para esta operação e não altera o plano congelado."
                  htmlFor="operation-first-production-mode"
                  label="Discovery desta operação"
                >
                  <NativeSelect
                    disabled={pending}
                    id="operation-first-production-mode"
                    onChange={(event) => setProductionMode(event.target.value as FirstProductionDiscoveryMode)}
                    value={productionMode}
                  >
                    <option value="fresh">Executar novo Discovery</option>
                    <option value="validation_snapshot">Reutilizar snapshot da validação</option>
                  </NativeSelect>
                </FormField>
                <Button
                  disabled={pending}
                  onClick={() => void run(
                    () => startOnboardingFirstProduction(execution.id, productionMode),
                    action === "retry_first_production" ? "Retentativa da primeira produção iniciada." : "Primeira produção iniciada.",
                  )}
                  type="button"
                >
                  {action === "retry_first_production" && <RotateCcw />}
                  {action === "retry_first_production" ? "Retentar primeira produção" : "Executar primeira produção"}
                </Button>
              </>
            )}

            {(useExistingDiscoveryRecovery?.enabled || createCustomDiscoveryRecovery?.enabled) && canExecute && (
              <OnboardingDiscoveryRecovery
                createCustomEnabled={createCustomDiscoveryRecovery?.enabled ?? false}
                execution={execution}
                onExecution={onExecution}
                useExistingEnabled={useExistingDiscoveryRecovery?.enabled ?? false}
              />
            )}

            {(action === "retry_failed_operation" || retryRecovery?.enabled) && canExecute && (
              <div className="space-y-2">
                <Button
                  disabled={pending}
                  onClick={retryFailedOperation}
                  type="button"
                  variant={retryRecovery?.priority === "secondary" ? "outline" : "default"}
                >
                  <RotateCcw />
                  Retentar etapa com falha
                </Button>
                {retryRecovery?.reason && <p className="text-sm text-muted-foreground">{retryRecovery.reason}</p>}
              </div>
            )}
          </section>
        )}

        {history.length > 1 && (
          <section className="space-y-3">
            <h3 className="text-base text-foreground">Execuções anteriores</h3>
            <ol className="divide-y rounded-lg border text-sm">
              {history.slice(1).map((item) => (
                <li className="flex flex-wrap items-center justify-between gap-2 px-4 py-3" key={item.id}>
                  <span>#{item.id} · {item.name}</span>
                  <Badge variant={STATE_BADGE_VARIANTS[item.state]}>{STATE_LABELS[item.state]}</Badge>
                </li>
              ))}
            </ol>
          </section>
        )}
      </CardContent>
    </Card>
  );
}
