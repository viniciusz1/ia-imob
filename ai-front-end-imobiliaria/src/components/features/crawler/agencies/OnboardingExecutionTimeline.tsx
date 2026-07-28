"use client";

import { AlertTriangle, Check, CircleDot, Clock, RotateCcw, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { usePermission } from "@/hooks/usePermission";
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

import { crawlerOperationErrorMessage } from "../crawlerOperationFeedback";

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
  if (["completed", "succeeded", "published"].includes(state)) return "border-emerald-600 bg-emerald-600 text-white";
  if (["failed", "requires_attention", "quarantined"].includes(state)) return "border-destructive bg-destructive text-destructive-foreground";
  if (["running", "queued", "awaiting_approval", "awaiting_first_production"].includes(state)) return "border-primary bg-primary text-primary-foreground";
  return "border-border bg-background text-muted-foreground";
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

  return (
    <li className="space-y-2 rounded-lg border bg-muted/10 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">Tentativa {operation.attempt} · Operação #{operation.id}</p>
        <Badge variant={operation.state === "failed" ? "destructive" : "outline"}>{operation.state}</Badge>
      </div>
      <Progress value={operation.progress.percentage} />
      <p className="text-sm text-muted-foreground">
        {operation.progress.stage} · {operation.progress.percentage}%{operation.progress.message ? ` · ${operation.progress.message}` : ""}
      </p>
      {operation.retry_of_operation_id && <p className="text-xs text-muted-foreground">Retentativa da operação #{operation.retry_of_operation_id}</p>}
      {operation.error && <p className="text-sm text-destructive">{operation.error.code}: {operation.error.message}</p>}
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <Link className="underline" href="/admin/crawler/operations">Abrir fila global</Link>
        <Link className="underline" href={detailHref}>Ver detalhes da operação</Link>
        {snapshotId && <Link className="underline" href={`/admin/crawler/discoveries/${snapshotId}`}>Ver Snapshot de Discovery</Link>}
        {runId && <Link className="underline" href={`/admin/crawler/runs/${runId}`}>Ver dados do crawl</Link>}
        {profileId && <Link className="underline" href={`/admin/crawler/agencies/${execution.crawl_agency_id}/profiles`}>Ver Perfil #{profileId}</Link>}
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

  return (
    <Card className="overflow-hidden border-primary/30">
      <CardHeader className="border-b bg-primary/5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{execution.name}</CardTitle>
            <CardDescription className="mt-1">Execução de Onboarding #{execution.id} · {execution.conduction === "automated" ? "automatizada" : "manual"}</CardDescription>
          </div>
          <Badge variant={execution.state === "requires_attention" ? "destructive" : "secondary"}>{STATE_LABELS[execution.state]}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className={`rounded-lg border p-4 ${execution.state === "requires_attention" ? "border-destructive/40 bg-destructive/5" : "bg-muted/20"}`}>
          <p className="font-medium">Etapa atual: {STEP_LABELS[execution.current_step]}</p>
          <p className="mt-1 text-sm text-muted-foreground">{stateMessage(execution)}</p>
        </section>

        <ol aria-label="Timeline da Execução de Onboarding" className="space-y-4">
          {execution.steps.map((step, index) => {
            const attempts = operationsByStep[step.key] ?? [];
            return (
              <li className="relative grid gap-3 sm:grid-cols-[2.75rem_minmax(0,1fr)]" key={step.key}>
                {index < execution.steps.length - 1 && <div aria-hidden="true" className="absolute bottom-[-1rem] left-[1.35rem] top-11 w-px bg-border" />}
                <span className={`relative z-10 flex size-11 items-center justify-center rounded-full border-2 ${stepStyle(step.state)}`}>{stepIcon(step.state)}</span>
                <div className="space-y-3 rounded-lg border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{index + 1}. {STEP_LABELS[step.key]}</p>
                      <p className="text-xs text-muted-foreground">{STEP_STATE_LABELS[step.state] ?? step.state}{step.attempt ? ` · tentativa ${step.attempt}` : ""}</p>
                    </div>
                    {step.operation_id && <Badge variant="outline">Operação #{step.operation_id}</Badge>}
                  </div>
                  {attempts.length > 0 && <ol aria-label={`Tentativas de ${STEP_LABELS[step.key]}`} className="space-y-2">{attempts.map((operation) => <OperationAttempt execution={execution} key={operation.id} operation={operation} />)}</ol>}
                </div>
              </li>
            );
          })}
        </ol>

        {action !== null && (
          <section aria-label="Próxima ação da Execução de Onboarding" className="space-y-4 rounded-lg border-2 border-primary/40 bg-primary/5 p-4">
            <div>
              <h3 className="font-medium">Próxima ação</h3>
              {!canShowMutation && !["wait_for_coordinator", "wait_for_current_operation", "review_attention"].includes(action) && (
                <p className="mt-1 text-sm text-muted-foreground">Somente leitura: a ação necessária não está disponível para suas permissões.</p>
              )}
            </div>

            {["wait_for_coordinator", "wait_for_current_operation"].includes(action) && (
              <p className="text-sm text-muted-foreground">Acompanhar o progresso. A tela será atualizada automaticamente.</p>
            )}

            {action === "review_attention" && <p className="text-sm text-muted-foreground">Revise a mensagem e as tentativas preservadas antes de decidir como corrigir a configuração.</p>}

            {manualAction && canExecute && (
              <>
                {["confirm_sample_url", "correct_sample_url"].includes(manualAction) && (
                  <div className="space-y-2">
                    <Label htmlFor="onboarding-sample-url">URL de Amostra</Label>
                    <Input disabled={pending} id="onboarding-sample-url" onChange={(event) => setSampleUrl(event.target.value)} type="url" value={sampleUrl} />
                  </div>
                )}
                <Button disabled={pending} onClick={() => runManualAction(manualAction)} type="button">{MANUAL_ACTIONS[manualAction]}</Button>
              </>
            )}

            {needsDiscoveryPolicy && canManagePolicies && (
              <>
                <p className="text-sm text-muted-foreground">O Discovery usou uma Configuração Pontual. Antes da aprovação, crie explicitamente a versão que poderá ser ativada para a agência.</p>
                <div className="space-y-2">
                  <Label htmlFor="approval-discovery-policy-name">Nome da nova Política de Discovery</Label>
                  <Input disabled={pending} id="approval-discovery-policy-name" onChange={(event) => setDiscoveryPolicyName(event.target.value)} value={discoveryPolicyName} />
                </div>
                <div className="flex items-start gap-2">
                  <Checkbox checked={discoveryPolicyConfirmed} disabled={pending} id="confirm-approval-discovery-policy" onCheckedChange={(checked) => setDiscoveryPolicyConfirmed(checked === true)} />
                  <Label className="font-normal" htmlFor="confirm-approval-discovery-policy">Confirmo a criação desta nova política ativa. Nenhuma política existente será sobrescrita.</Label>
                </div>
                <Button disabled={pending || !discoveryPolicyName.trim() || !discoveryPolicyConfirmed} onClick={saveDiscoveryPolicy} type="button">Salvar como nova política ativa</Button>
              </>
            )}

            {action === "decide_onboarding" && !needsDiscoveryPolicy && canApprove && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="onboarding-approval-reason">Justificativa da aprovação</Label>
                  <Textarea disabled={pending} id="onboarding-approval-reason" onChange={(event) => setApprovalReason(event.target.value)} placeholder="Obrigatória quando a validação tiver bloqueios." value={approvalReason} />
                </div>
                <Button disabled={pending} onClick={() => void run(() => approveOnboardingExecution(execution.id, approvalReason), "Onboarding aprovado. O restante do fluxo pode continuar.")} type="button">Aprovar e continuar</Button>
              </>
            )}

            {["start_first_production", "retry_first_production"].includes(action) && canExecute && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="operation-first-production-mode">Discovery desta operação</Label>
                  <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" disabled={pending} id="operation-first-production-mode" onChange={(event) => setProductionMode(event.target.value as FirstProductionDiscoveryMode)} value={productionMode}>
                    <option value="fresh">Executar novo Discovery</option>
                    <option value="validation_snapshot">Reutilizar snapshot da validação</option>
                  </select>
                  <p className="text-xs text-muted-foreground">Uma mudança aqui vale somente para esta operação e não altera o plano congelado.</p>
                </div>
                <Button disabled={pending} onClick={() => void run(
                  () => startOnboardingFirstProduction(execution.id, productionMode),
                  action === "retry_first_production" ? "Retentativa da primeira produção iniciada." : "Primeira produção iniciada.",
                )} type="button">
                  {action === "retry_first_production" && <RotateCcw />}
                  {action === "retry_first_production" ? "Retentar primeira produção" : "Executar primeira produção"}
                </Button>
              </>
            )}

            {action === "retry_failed_operation" && canExecute && <Button disabled={pending} onClick={retryFailedOperation} type="button"><RotateCcw />Retentar etapa com falha</Button>}
          </section>
        )}

        {history.length > 1 && (
          <section className="space-y-2">
            <h3 className="font-medium">Execuções anteriores</h3>
            <ol className="space-y-2 text-sm">
              {history.slice(1).map((item) => (
                <li className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3" key={item.id}>
                  <span>#{item.id} · {item.name}</span>
                  <Badge variant="outline">{STATE_LABELS[item.state]}</Badge>
                </li>
              ))}
            </ol>
          </section>
        )}
      </CardContent>
    </Card>
  );
}
