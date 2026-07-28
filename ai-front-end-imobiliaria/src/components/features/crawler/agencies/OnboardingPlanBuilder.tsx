"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePermission } from "@/hooks/usePermission";
import {
  confirmOnboardingPlan,
  saveOnboardingPointConfiguration,
  updateOnboardingPlan,
} from "@/services/crawlerService";
import type {
  CrawlAgency,
  DiscoveryPolicyVersion,
  DiscoverySnapshot,
  DiscoveryStrategy,
  ExtractionPolicyVersion,
  ExtractionStrategy,
  FirstProductionDiscoveryMode,
  ManualOnboardingConfiguration,
  OnboardingConduction,
  OnboardingExecution,
  OnboardingExecutionModelVersion,
  OnboardingPlan,
  OnboardingPlanInput,
} from "@/types/crawler";

import { crawlerOperationErrorMessage } from "../crawlerOperationFeedback";

const EXTRACTION_STRATEGIES: Array<{ key: ExtractionStrategy; label: string }> = [
  { key: "xpath", label: "XPath" },
  { key: "css", label: "CSS" },
  { key: "fit_markdown_regex", label: "Markdown filtrado + regex" },
  { key: "fit_markdown_llm", label: "Markdown filtrado + IA" },
  { key: "llm_full_html", label: "HTML completo + IA" },
];

type PolicyChoice = "catalog" | "point";

interface OnboardingPlanBuilderProps {
  agency: CrawlAgency;
  discoveryPolicies: DiscoveryPolicyVersion[];
  discoveryStrategies: DiscoveryStrategy[];
  extractionPolicies: ExtractionPolicyVersion[];
  models: OnboardingExecutionModelVersion[];
  onConfirmed: (execution: OnboardingExecution) => void;
  plan: OnboardingPlan;
  snapshots: DiscoverySnapshot[];
}

function suggestedName(
  agency: CrawlAgency,
  conduction: OnboardingConduction,
  model: OnboardingExecutionModelVersion | undefined,
  date: string,
) {
  const choice = conduction === "manual" ? "Manual" : (model?.name ?? "Modelo");
  const timestamp = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(date));

  return `${agency.name} — ${choice} — ${timestamp}`;
}

function PolicySummary({
  label,
  name,
  strategies,
  version,
}: {
  label: string;
  name: string;
  strategies: string[];
  version: number | null;
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">{label}: {name}</p>
        {version !== null && <Badge variant="outline">v{version}</Badge>}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{strategies.join(" → ")}</p>
    </div>
  );
}

function StrategyChoices({
  disabled,
  onChange,
  options,
  prefix,
  selected,
}: {
  disabled: boolean;
  onChange: (strategies: string[]) => void;
  options: Array<{ key: string; label: string }>;
  prefix: string;
  selected: string[];
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((strategy) => (
        <div className="flex items-center gap-2 rounded-md border p-2" key={strategy.key}>
          <Checkbox
            checked={selected.includes(strategy.key)}
            disabled={disabled}
            id={`${prefix}-${strategy.key}`}
            onCheckedChange={(checked) => {
              const selectedKeys = checked === true
                ? [...selected, strategy.key]
                : selected.filter((key) => key !== strategy.key);
              onChange(options.map((option) => option.key).filter((key) => selectedKeys.includes(key)));
            }}
          />
          <Label className="font-normal" htmlFor={`${prefix}-${strategy.key}`}>{strategy.label}</Label>
        </div>
      ))}
    </div>
  );
}

export function OnboardingPlanBuilder({
  agency,
  discoveryPolicies: initialDiscoveryPolicies,
  discoveryStrategies,
  extractionPolicies: initialExtractionPolicies,
  models,
  onConfirmed,
  plan,
  snapshots,
}: OnboardingPlanBuilderProps) {
  const availableModels = models.filter((model) => model.status === "available");
  const [discoveryPolicies, setDiscoveryPolicies] = useState(
    initialDiscoveryPolicies.filter((policy) => policy.status === "available"),
  );
  const [extractionPolicies, setExtractionPolicies] = useState(
    initialExtractionPolicies.filter((policy) => policy.status === "available"),
  );
  const initialModel = availableModels.find((model) => model.id === plan.execution_model_version_id)
    ?? availableModels.find((model) => model.is_default)
    ?? availableModels[0];
  const initialManual = plan.manual_configuration;
  const initialConduction = plan.conduction ?? (initialModel ? "automated" : "manual");
  const [conduction, setConduction] = useState<OnboardingConduction>(initialConduction);
  const [modelId, setModelId] = useState(initialModel?.id ?? 0);
  const [name, setName] = useState(
    plan.name ?? suggestedName(agency, initialConduction, initialModel, plan.created_at),
  );
  const [firstProductionMode, setFirstProductionMode] = useState<FirstProductionDiscoveryMode>(
    plan.first_production_discovery_mode ?? "fresh",
  );
  const [discoveryMode, setDiscoveryMode] = useState<"fresh" | "existing">(
    initialManual?.discovery.mode ?? "fresh",
  );
  const [snapshotId, setSnapshotId] = useState(initialManual?.discovery.discovery_snapshot_id ?? snapshots[0]?.id ?? 0);
  const [discoveryChoice, setDiscoveryChoice] = useState<PolicyChoice>(
    initialManual?.discovery.point_configuration ? "point" : "catalog",
  );
  const [discoveryPolicyId, setDiscoveryPolicyId] = useState(
    initialManual?.discovery.policy_version_id ?? discoveryPolicies[0]?.id ?? 0,
  );
  const [discoveryPointStrategies, setDiscoveryPointStrategies] = useState<string[]>(
    initialManual?.discovery.point_configuration?.strategies
      ?? discoveryStrategies.filter((strategy) => strategy.active && strategy.safety_status === "safe").map((strategy) => strategy.key),
  );
  const [extractionChoice, setExtractionChoice] = useState<PolicyChoice>(
    initialManual?.extraction.point_configuration ? "point" : "catalog",
  );
  const [extractionPolicyId, setExtractionPolicyId] = useState(
    initialManual?.extraction.policy_version_id ?? extractionPolicies[0]?.id ?? 0,
  );
  const [extractionPointStrategies, setExtractionPointStrategies] = useState<ExtractionStrategy[]>(
    initialManual?.extraction.point_configuration?.strategies ?? EXTRACTION_STRATEGIES.map((strategy) => strategy.key),
  );
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [pending, setPending] = useState<"save" | "confirm" | "policy" | null>(null);
  const [policySave, setPolicySave] = useState<{ kind: "discovery" | "extraction"; name: string } | null>(null);
  const [policySaveConfirmed, setPolicySaveConfirmed] = useState(false);
  const canExecute = usePermission("crawler.operations.execute");
  const canManagePolicies = usePermission("crawler.policies.manage");
  const selectedModel = availableModels.find((model) => model.id === modelId);
  const selectedDiscoveryPolicy = discoveryPolicies.find((policy) => policy.id === discoveryPolicyId);
  const selectedExtractionPolicy = extractionPolicies.find((policy) => policy.id === extractionPolicyId);
  const safeDiscoveryStrategies = discoveryStrategies
    .filter((strategy) => strategy.active && strategy.safety_status === "safe")
    .map((strategy) => ({ key: strategy.key, label: strategy.label }));

  const validationMessage = useMemo(() => {
    if (!name.trim()) return "Dê um nome para identificar esta execução.";
    if (conduction === "automated" && !selectedModel) return "Selecione um modelo disponível.";
    if (conduction === "manual" && discoveryMode === "existing" && snapshotId === 0) {
      return "Selecione um Snapshot de Discovery desta Crawl Agency.";
    }
    if (conduction === "manual" && discoveryChoice === "catalog" && !selectedDiscoveryPolicy) {
      return "Selecione uma Política de Discovery.";
    }
    if (conduction === "manual" && discoveryChoice === "point" && discoveryPointStrategies.length === 0) {
      return "Selecione ao menos uma Estratégia de Discovery.";
    }
    if (conduction === "manual" && extractionChoice === "catalog" && !selectedExtractionPolicy) {
      return "Selecione uma Política de Extração.";
    }
    if (conduction === "manual" && extractionChoice === "point" && extractionPointStrategies.length === 0) {
      return "Selecione ao menos uma Estratégia de Extração.";
    }
    return null;
  }, [
    conduction,
    discoveryChoice,
    discoveryMode,
    discoveryPointStrategies.length,
    extractionChoice,
    extractionPointStrategies.length,
    name,
    selectedModel,
    selectedDiscoveryPolicy,
    selectedExtractionPolicy,
    snapshotId,
  ]);

  const payload = (): OnboardingPlanInput => {
    if (conduction === "automated") {
      return {
        name: name.trim(),
        conduction,
        execution_model_version_id: modelId,
        first_production_discovery_mode: firstProductionMode,
      };
    }

    const manual: ManualOnboardingConfiguration = {
      discovery: {
        mode: discoveryMode,
        ...(discoveryMode === "existing" ? { discovery_snapshot_id: snapshotId } : {}),
        ...(discoveryChoice === "catalog"
          ? { policy_version_id: discoveryPolicyId }
          : {
              point_configuration: {
                strategies: discoveryPointStrategies,
                configuration: {
                  max_urls: 500,
                  include_subdomains: false,
                  use_browser_for_homepage: true,
                },
              },
            }),
      },
      extraction: extractionChoice === "catalog"
        ? { policy_version_id: extractionPolicyId }
        : {
            point_configuration: {
              strategies: extractionPointStrategies,
              configuration: {},
            },
          },
    };

    return {
      name: name.trim(),
      conduction,
      manual_configuration: manual,
      first_production_discovery_mode: firstProductionMode,
    };
  };

  const persist = async (): Promise<OnboardingPlan | null> => {
    if (validationMessage !== null) {
      toast.error(validationMessage);
      return null;
    }
    return updateOnboardingPlan(agency.id, payload());
  };

  const saveDraft = async () => {
    setPending("save");
    try {
      if (await persist()) toast.success("Plano de Onboarding salvo em rascunho.");
    } catch (error: unknown) {
      toast.error(crawlerOperationErrorMessage(error, "Não foi possível salvar o plano."));
    } finally {
      setPending(null);
    }
  };

  const confirm = async () => {
    if (!reviewConfirmed) {
      toast.error("Confirme que a combinação será congelada.");
      return;
    }
    setPending("confirm");
    try {
      if (!(await persist())) return;
      const execution = await confirmOnboardingPlan(agency.id);
      toast.success(`Execução de Onboarding #${execution.id} confirmada.`);
      onConfirmed(execution);
    } catch (error: unknown) {
      toast.error(crawlerOperationErrorMessage(error, "Não foi possível confirmar o plano."));
    } finally {
      setPending(null);
    }
  };

  const savePointPolicy = async () => {
    if (policySave === null || !policySave.name.trim() || !policySaveConfirmed) return;
    setPending("policy");
    try {
      if (!(await persist())) return;
      const policy = await saveOnboardingPointConfiguration(agency.id, policySave.kind, policySave.name.trim());
      if (policySave.kind === "discovery") {
        const discoveryPolicy = policy as DiscoveryPolicyVersion;
        setDiscoveryPolicies((current) => [...current, discoveryPolicy]);
        setDiscoveryChoice("catalog");
        setDiscoveryPolicyId(discoveryPolicy.id);
      } else {
        const extractionPolicy = policy as ExtractionPolicyVersion;
        setExtractionPolicies((current) => [...current, extractionPolicy]);
        setExtractionChoice("catalog");
        setExtractionPolicyId(extractionPolicy.id);
      }
      setPolicySave(null);
      setPolicySaveConfirmed(false);
      toast.success("Nova política ativa criada e selecionada explicitamente para este plano.");
    } catch (error: unknown) {
      toast.error(crawlerOperationErrorMessage(error, "Não foi possível salvar a nova política."));
    } finally {
      setPending(null);
    }
  };

  const disabled = !canExecute || pending !== null;
  return (
    <Card className="border-primary/30">
      <CardHeader className="border-b bg-primary/5">
        <CardTitle>Plano de Onboarding</CardTitle>
        <CardDescription>
          Monte, nomeie e revise a combinação. Nenhuma Operação do Crawler começa antes da confirmação.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!canExecute && (
          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            Modo somente leitura. Você pode revisar o plano, mas não vê ações de alteração ou execução.
          </p>
        )}

        <div className="space-y-2">
          <Label htmlFor="onboarding-name">Nome da execução</Label>
          <Input disabled={disabled} id="onboarding-name" maxLength={160} onChange={(event) => setName(event.target.value)} value={name} />
          <p className="text-xs text-muted-foreground">Use este nome para distinguir combinações e tentativas futuras.</p>
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Condução</legend>
          <div className="grid gap-3 md:grid-cols-2">
            <button
              aria-pressed={conduction === "automated"}
              className={`rounded-lg border p-4 text-left ${conduction === "automated" ? "border-primary bg-primary/5" : ""}`}
              disabled={disabled}
              onClick={() => setConduction("automated")}
              type="button"
            >
              <span className="font-medium">Automatizada</span>
              <span className="mt-1 block text-sm text-muted-foreground">Executa a combinação do modelo e para na validação para sua aprovação.</span>
            </button>
            <button
              aria-pressed={conduction === "manual"}
              className={`rounded-lg border p-4 text-left ${conduction === "manual" ? "border-primary bg-primary/5" : ""}`}
              disabled={disabled}
              onClick={() => setConduction("manual")}
              type="button"
            >
              <span className="font-medium">Manual, etapa por etapa</span>
              <span className="mt-1 block text-sm text-muted-foreground">Mantém o fluxo atual: você inicia uma etapa por vez, sem exigir Modelo de Execução.</span>
            </button>
          </div>
        </fieldset>

        {conduction === "automated" ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="onboarding-model">Modelo de Execução</Label>
              <select
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                disabled={disabled}
                id="onboarding-model"
                onChange={(event) => setModelId(Number(event.target.value))}
                value={modelId}
              >
                <option value={0}>Selecione um modelo</option>
                {availableModels.map((model) => <option key={model.id} value={model.id}>{model.name} · v{model.version}</option>)}
              </select>
            </div>
            {selectedModel && (
              <div aria-label="Configuração resolvida do modelo" className="grid gap-3 md:grid-cols-2">
                <PolicySummary
                  label="Discovery"
                  name={selectedModel.discovery_policy.name}
                  strategies={selectedModel.discovery_policy.strategies}
                  version={selectedModel.discovery_policy.version}
                />
                <PolicySummary
                  label="Extração"
                  name={selectedModel.extraction_policy.name}
                  strategies={selectedModel.extraction_policy.strategies}
                  version={selectedModel.extraction_policy.version}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <section className="space-y-4 rounded-lg border p-4">
              <div>
                <h3 className="font-medium">1. Discovery</h3>
                <p className="text-sm text-muted-foreground">Gere um snapshot novo ou reutilize explicitamente um snapshot desta Crawl Agency.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="manual-discovery-mode">Origem do snapshot</Label>
                  <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" disabled={disabled} id="manual-discovery-mode" onChange={(event) => setDiscoveryMode(event.target.value as "fresh" | "existing")} value={discoveryMode}>
                    <option value="fresh">Executar novo Discovery</option>
                    <option value="existing">Reutilizar Snapshot de Discovery</option>
                  </select>
                </div>
                {discoveryMode === "existing" && (
                  <div className="space-y-2">
                    <Label htmlFor="manual-discovery-snapshot">Snapshot</Label>
                    <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" disabled={disabled} id="manual-discovery-snapshot" onChange={(event) => setSnapshotId(Number(event.target.value))} value={snapshotId}>
                      <option value={0}>Selecione um snapshot</option>
                      {snapshots.map((snapshot) => <option key={snapshot.id} value={snapshot.id}>#{snapshot.id} · {snapshot.url_count} URLs</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div aria-label="Configuração do Discovery" className="flex flex-wrap gap-2" role="group">
                  <Button disabled={disabled} onClick={() => setDiscoveryChoice("catalog")} size="sm" type="button" variant={discoveryChoice === "catalog" ? "secondary" : "outline"}>Política existente</Button>
                  <Button disabled={disabled} onClick={() => setDiscoveryChoice("point")} size="sm" type="button" variant={discoveryChoice === "point" ? "secondary" : "outline"}>Configuração Pontual</Button>
                </div>
                {discoveryChoice === "catalog" ? (
                  <select aria-label="Política de Discovery" className="h-9 w-full rounded-md border bg-background px-3 text-sm" disabled={disabled} onChange={(event) => setDiscoveryPolicyId(Number(event.target.value))} value={discoveryPolicyId}>
                    <option value={0}>Selecione uma política</option>
                    {discoveryPolicies.map((policy) => <option key={policy.id} value={policy.id}>{policy.name} · v{policy.version}</option>)}
                  </select>
                ) : (
                  <>
                    <StrategyChoices disabled={disabled} onChange={setDiscoveryPointStrategies} options={safeDiscoveryStrategies} prefix="point-discovery" selected={discoveryPointStrategies} />
                    <p className="text-xs text-muted-foreground">A sobrescrita vale somente para esta execução. Ela não altera a política do catálogo.</p>
                    {canManagePolicies && <Button disabled={disabled} onClick={() => { setPolicySave({ kind: "discovery", name: "" }); setPolicySaveConfirmed(false); }} size="sm" type="button" variant="outline">Salvar como nova política ativa</Button>}
                  </>
                )}
              </div>
            </section>

            <section className="space-y-4 rounded-lg border p-4">
              <div>
                <h3 className="font-medium">2. Extração</h3>
                <p className="text-sm text-muted-foreground">Escolha uma política ou mantenha o comportamento atual com estratégias pontuais, sem Modelo de Execução.</p>
              </div>
              <div aria-label="Configuração da Extração" className="flex flex-wrap gap-2" role="group">
                <Button disabled={disabled} onClick={() => setExtractionChoice("catalog")} size="sm" type="button" variant={extractionChoice === "catalog" ? "secondary" : "outline"}>Política existente</Button>
                <Button disabled={disabled} onClick={() => setExtractionChoice("point")} size="sm" type="button" variant={extractionChoice === "point" ? "secondary" : "outline"}>Sem modelo · comportamento atual</Button>
              </div>
              {extractionChoice === "catalog" ? (
                <select aria-label="Política de Extração" className="h-9 w-full rounded-md border bg-background px-3 text-sm" disabled={disabled} onChange={(event) => setExtractionPolicyId(Number(event.target.value))} value={extractionPolicyId}>
                  <option value={0}>Selecione uma política</option>
                  {extractionPolicies.map((policy) => <option key={policy.id} value={policy.id}>{policy.name} · v{policy.version}</option>)}
                </select>
              ) : (
                <>
                  <StrategyChoices disabled={disabled} onChange={(strategies) => setExtractionPointStrategies(strategies as ExtractionStrategy[])} options={EXTRACTION_STRATEGIES} prefix="point-extraction" selected={extractionPointStrategies} />
                  <p className="text-xs text-muted-foreground">As estratégias rodam na ordem exibida e preenchem apenas os campos ainda ausentes.</p>
                  {canManagePolicies && <Button disabled={disabled} onClick={() => { setPolicySave({ kind: "extraction", name: "" }); setPolicySaveConfirmed(false); }} size="sm" type="button" variant="outline">Salvar como nova política ativa</Button>}
                </>
              )}
            </section>
          </div>
        )}

        {policySave && (
          <section aria-label="Salvar Configuração Pontual" className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
            <div className="space-y-2">
              <Label htmlFor="point-policy-name">Nome da nova política</Label>
              <Input disabled={pending !== null} id="point-policy-name" onChange={(event) => setPolicySave((current) => current ? { ...current, name: event.target.value } : null)} value={policySave.name} />
            </div>
            <div className="flex items-start gap-2">
              <Checkbox checked={policySaveConfirmed} disabled={pending !== null} id="confirm-point-policy-save" onCheckedChange={(checked) => setPolicySaveConfirmed(checked === true)} />
              <Label className="font-normal" htmlFor="confirm-point-policy-save">Confirmo a criação de uma nova política. A configuração deste plano continuará sendo pontual.</Label>
            </div>
            <div className="flex gap-2">
              <Button disabled={pending !== null || !policySave.name.trim() || !policySaveConfirmed} onClick={() => void savePointPolicy()} size="sm" type="button">Criar nova política</Button>
              <Button disabled={pending !== null} onClick={() => setPolicySave(null)} size="sm" type="button" variant="ghost">Cancelar</Button>
            </div>
          </section>
        )}

        <section className="space-y-3 rounded-lg border p-4">
          <div>
            <h3 className="font-medium">Primeira produção</h3>
            <p className="text-sm text-muted-foreground">Este modo fica visível e será congelado junto com a combinação.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="first-production-mode">Modo de Discovery</Label>
            <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" disabled={disabled} id="first-production-mode" onChange={(event) => setFirstProductionMode(event.target.value as FirstProductionDiscoveryMode)} value={firstProductionMode}>
              <option value="fresh">Novo Discovery na primeira produção</option>
              <option value="validation_snapshot">Reutilizar o snapshot da validação</option>
            </select>
          </div>
        </section>

        <section aria-label="Revisão final do plano" className="space-y-3 rounded-lg border-2 border-primary/30 p-4">
          <div>
            <h3 className="font-medium">Revisão final</h3>
            <p className="text-sm text-muted-foreground">Confirmar congela o nome, a condução, as versões, as estratégias e o modo da primeira produção nesta execução.</p>
          </div>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div><dt className="text-muted-foreground">Execução</dt><dd className="font-medium">{name || "Sem nome"}</dd></div>
            <div><dt className="text-muted-foreground">Condução</dt><dd className="font-medium">{conduction === "automated" ? "Automatizada" : "Manual, etapa por etapa"}</dd></div>
            <div><dt className="text-muted-foreground">Discovery</dt><dd className="font-medium">{conduction === "automated" ? selectedModel?.discovery_policy.name ?? "Não selecionado" : discoveryChoice === "catalog" ? selectedDiscoveryPolicy?.name ?? "Não selecionada" : `${discoveryPointStrategies.length} estratégias pontuais`}</dd></div>
            <div><dt className="text-muted-foreground">Extração</dt><dd className="font-medium">{conduction === "automated" ? selectedModel?.extraction_policy.name ?? "Não selecionado" : extractionChoice === "catalog" ? selectedExtractionPolicy?.name ?? "Não selecionada" : "Sem modelo · configuração pontual"}</dd></div>
            <div><dt className="text-muted-foreground">Primeira produção</dt><dd className="font-medium">{firstProductionMode === "fresh" ? "Novo Discovery" : "Snapshot da validação"}</dd></div>
          </dl>
          {canExecute && (
            <div className="flex items-start gap-2">
              <Checkbox checked={reviewConfirmed} disabled={pending !== null} id="confirm-frozen-plan" onCheckedChange={(checked) => setReviewConfirmed(checked === true)} />
              <Label className="font-normal" htmlFor="confirm-frozen-plan">Revisei a combinação e entendo que alterações depois do início exigem cancelar e criar uma nova execução.</Label>
            </div>
          )}
        </section>

        {validationMessage && <p className="text-sm text-destructive" role="alert">{validationMessage}</p>}
        {canExecute && (
          <div className="flex flex-wrap gap-2">
            <Button disabled={pending !== null || validationMessage !== null} onClick={() => void saveDraft()} type="button" variant="outline">{pending === "save" ? "Salvando…" : "Salvar rascunho"}</Button>
            <Button disabled={pending !== null || validationMessage !== null || !reviewConfirmed} onClick={() => void confirm()} type="button">{pending === "confirm" ? "Confirmando…" : "Confirmar e iniciar execução"}</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
