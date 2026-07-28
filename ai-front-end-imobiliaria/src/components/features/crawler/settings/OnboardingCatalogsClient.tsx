"use client";

import { isAxiosError } from "axios";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  archiveDiscoveryPolicyVersion,
  archiveExtractionPolicyVersion,
  archiveOnboardingExecutionModelVersion,
  createDiscoveryPolicyVersion,
  createDiscoveryPolicyVersionFrom,
  createDiscoveryStrategy,
  createExtractionPolicyVersion,
  createExtractionPolicyVersionFrom,
  createOnboardingExecutionModelVersion,
  createOnboardingExecutionModelVersionFrom,
  makeOnboardingExecutionModelDefault,
  publishDiscoveryPolicyVersion,
  publishExtractionPolicyVersion,
  publishOnboardingExecutionModelVersion,
  updateDiscoveryPolicyVersion,
  updateExtractionPolicyVersion,
  updateOnboardingExecutionModelVersion,
} from "@/services/crawlerService";
import type {
  DiscoveryPolicyVersion,
  DiscoveryStrategy,
  ExtractionPolicyVersion,
  ExtractionStrategy,
  OnboardingCatalogStatus,
  OnboardingExecutionModelVersion,
} from "@/types/crawler";

const extractionStrategies: Array<{ key: ExtractionStrategy; label: string }> = [
  { key: "xpath", label: "XPath" },
  { key: "css", label: "CSS" },
  { key: "fit_markdown_regex", label: "Markdown filtrado + regex" },
  { key: "fit_markdown_llm", label: "Markdown filtrado + IA" },
  { key: "llm_full_html", label: "HTML completo + IA" },
];

const statusLabels: Record<OnboardingCatalogStatus, string> = {
  draft: "Rascunho",
  available: "Disponível",
  archived: "Arquivada",
};

interface OnboardingCatalogsClientProps {
  initialDiscoveryStrategies: DiscoveryStrategy[];
  initialDiscoveryPolicies: DiscoveryPolicyVersion[];
  initialExtractionPolicies: ExtractionPolicyVersion[];
  initialModels: OnboardingExecutionModelVersion[];
}

interface ApiValidationError {
  message?: string;
  errors?: Record<string, string[]>;
}

function errorMessage(error: unknown): string {
  if (isAxiosError<ApiValidationError>(error)) {
    const firstValidationMessage = Object.values(error.response?.data.errors ?? {}).flat()[0];
    return firstValidationMessage ?? error.response?.data.message ?? "Não foi possível concluir a ação.";
  }
  return error instanceof Error ? error.message : "Não foi possível concluir a ação.";
}

function useCatalogAction() {
  const [pending, setPending] = useState(false);

  const execute = async <T,>(
    action: () => Promise<T>,
    successMessage: string,
    apply: (result: T) => void,
  ): Promise<void> => {
    setPending(true);
    try {
      const result = await action();
      apply(result);
      toast.success(successMessage);
    } catch (error: unknown) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  };

  return { pending, execute };
}

function StrategyChoices({
  options,
  selected,
  onChange,
  prefix,
}: {
  options: Array<{ key: string; label: string }>;
  selected: string[];
  onChange: (selected: string[]) => void;
  prefix: string;
}) {
  const toggle = (key: string, checked: boolean) => {
    onChange(checked ? [...selected, key] : selected.filter((item) => item !== key));
  };

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {options.map((option) => (
        <div className="flex items-center gap-2" key={option.key}>
          <Checkbox
            checked={selected.includes(option.key)}
            id={`${prefix}-${option.key}`}
            onCheckedChange={(checked) => toggle(option.key, checked === true)}
          />
          <Label htmlFor={`${prefix}-${option.key}`}>{option.label}</Label>
        </div>
      ))}
    </div>
  );
}

function VersionHeading({
  name,
  version,
  status,
  isDefault = false,
}: {
  name: string;
  version: number;
  status: OnboardingCatalogStatus;
  isDefault?: boolean;
}) {
  return (
    <CardHeader className="flex-row items-start justify-between gap-3">
      <div>
        <CardTitle>{name} · v{version}</CardTitle>
        <p className="mt-1 text-xs text-muted-foreground">
          {status === "draft" ? "Editável até a publicação" : "Conteúdo imutável"}
        </p>
      </div>
      <div className="flex gap-2">
        {isDefault && <Badge>Padrão global</Badge>}
        <Badge variant={status === "archived" ? "outline" : "secondary"}>{statusLabels[status]}</Badge>
      </div>
    </CardHeader>
  );
}

function DiscoveryVersionCard({
  policy,
  strategies,
  onReplace,
  onAdd,
}: {
  policy: DiscoveryPolicyVersion;
  strategies: DiscoveryStrategy[];
  onReplace: (policy: DiscoveryPolicyVersion) => void;
  onAdd: (policy: DiscoveryPolicyVersion) => void;
}) {
  const options = strategies
    .filter((strategy) => strategy.active && strategy.safety_status === "safe")
    .map((strategy) => ({ key: strategy.key, label: strategy.label }));
  const [selected, setSelected] = useState(policy.strategies);
  const [maxUrls, setMaxUrls] = useState(policy.configuration.max_urls ?? 1000);
  const { pending, execute } = useCatalogAction();
  const dirty = selected.join("|") !== policy.strategies.join("|")
    || maxUrls !== (policy.configuration.max_urls ?? 1000);

  return (
    <Card>
      <VersionHeading name={policy.name} status={policy.status} version={policy.version} />
      <CardContent className="space-y-4">
        {policy.mutable ? (
          <>
            <StrategyChoices
              onChange={setSelected}
              options={options}
              prefix={`discovery-${policy.id}`}
              selected={selected}
            />
            <div className="max-w-xs space-y-2">
              <Label htmlFor={`discovery-max-${policy.id}`}>Limite de URLs</Label>
              <Input
                id={`discovery-max-${policy.id}`}
                max={10000}
                min={1}
                onChange={(event) => setMaxUrls(event.target.valueAsNumber)}
                type="number"
                value={maxUrls}
              />
            </div>
          </>
        ) : (
          <p className="text-sm">Estratégias: {policy.strategies.join(" → ")}</p>
        )}
        <p className="text-sm text-muted-foreground">
          Referenciada por {policy.model_reference_count} modelo(s);
          {" "}{policy.active_model_reference_count} ainda selecionável(is).
        </p>
        <div className="flex flex-wrap gap-2">
          {policy.status === "draft" && (
            <>
              <Button
                disabled={pending || !dirty || selected.length === 0}
                onClick={() => void execute(
                  () => updateDiscoveryPolicyVersion(policy.id, {
                    strategies: selected,
                    configuration: { ...policy.configuration, max_urls: maxUrls },
                  }),
                  "Rascunho salvo.",
                  onReplace,
                )}
                type="button"
                variant="outline"
              >
                Salvar alterações
              </Button>
              <Button
                disabled={pending || dirty}
                onClick={() => void execute(
                  () => publishDiscoveryPolicyVersion(policy.id),
                  "Política de discovery publicada.",
                  onReplace,
                )}
                type="button"
              >
                Publicar versão
              </Button>
              <Button
                disabled={pending}
                onClick={() => void execute(
                  () => archiveDiscoveryPolicyVersion(policy.id),
                  "Rascunho arquivado.",
                  onReplace,
                )}
                type="button"
                variant="outline"
              >
                Descartar rascunho
              </Button>
            </>
          )}
          {policy.status !== "draft" && (
            <Button
              disabled={pending}
              onClick={() => void execute(
                () => createDiscoveryPolicyVersionFrom(policy.id),
                "Nova versão criada em rascunho.",
                onAdd,
              )}
              type="button"
              variant="outline"
            >
              Criar nova versão
            </Button>
          )}
          {policy.status === "available" && (
            <Button
              disabled={pending || policy.active_model_reference_count > 0}
              onClick={() => void execute(
                () => archiveDiscoveryPolicyVersion(policy.id),
                "Versão arquivada.",
                onReplace,
              )}
              type="button"
              variant="outline"
            >
              Arquivar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ExtractionVersionCard({
  policy,
  onReplace,
  onAdd,
}: {
  policy: ExtractionPolicyVersion;
  onReplace: (policy: ExtractionPolicyVersion) => void;
  onAdd: (policy: ExtractionPolicyVersion) => void;
}) {
  const [selected, setSelected] = useState<ExtractionStrategy[]>(policy.strategies);
  const { pending, execute } = useCatalogAction();
  const dirty = selected.join("|") !== policy.strategies.join("|");

  const updateSelection = (keys: string[]) => {
    setSelected(extractionStrategies
      .map((strategy) => strategy.key)
      .filter((strategy) => keys.includes(strategy)));
  };

  return (
    <Card>
      <VersionHeading name={policy.name} status={policy.status} version={policy.version} />
      <CardContent className="space-y-4">
        {policy.mutable ? (
          <StrategyChoices
            onChange={updateSelection}
            options={extractionStrategies}
            prefix={`extraction-${policy.id}`}
            selected={selected}
          />
        ) : (
          <p className="text-sm">Fallback: {policy.strategies.join(" → ")}</p>
        )}
        <p className="text-sm text-muted-foreground">
          Referenciada por {policy.model_reference_count} modelo(s);
          {" "}{policy.active_model_reference_count} ainda selecionável(is).
        </p>
        <div className="flex flex-wrap gap-2">
          {policy.status === "draft" && (
            <>
              <Button
                disabled={pending || !dirty || selected.length === 0}
                onClick={() => void execute(
                  () => updateExtractionPolicyVersion(policy.id, {
                    strategies: selected,
                    configuration: policy.configuration,
                  }),
                  "Rascunho salvo.",
                  onReplace,
                )}
                type="button"
                variant="outline"
              >
                Salvar alterações
              </Button>
              <Button
                disabled={pending || dirty}
                onClick={() => void execute(
                  () => publishExtractionPolicyVersion(policy.id),
                  "Política de extração publicada.",
                  onReplace,
                )}
                type="button"
              >
                Publicar versão
              </Button>
              <Button
                disabled={pending}
                onClick={() => void execute(
                  () => archiveExtractionPolicyVersion(policy.id),
                  "Rascunho arquivado.",
                  onReplace,
                )}
                type="button"
                variant="outline"
              >
                Descartar rascunho
              </Button>
            </>
          )}
          {policy.status !== "draft" && (
            <Button
              disabled={pending}
              onClick={() => void execute(
                () => createExtractionPolicyVersionFrom(policy.id),
                "Nova versão criada em rascunho.",
                onAdd,
              )}
              type="button"
              variant="outline"
            >
              Criar nova versão
            </Button>
          )}
          {policy.status === "available" && (
            <Button
              disabled={pending || policy.active_model_reference_count > 0}
              onClick={() => void execute(
                () => archiveExtractionPolicyVersion(policy.id),
                "Versão arquivada.",
                onReplace,
              )}
              type="button"
              variant="outline"
            >
              Arquivar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ModelVersionCard({
  model,
  discoveryPolicies,
  extractionPolicies,
  onReplace,
  onAdd,
}: {
  model: OnboardingExecutionModelVersion;
  discoveryPolicies: DiscoveryPolicyVersion[];
  extractionPolicies: ExtractionPolicyVersion[];
  onReplace: (model: OnboardingExecutionModelVersion) => void;
  onAdd: (model: OnboardingExecutionModelVersion) => void;
}) {
  const [discoveryId, setDiscoveryId] = useState(model.discovery_policy_version_id);
  const [extractionId, setExtractionId] = useState(model.extraction_policy_version_id);
  const { pending, execute } = useCatalogAction();
  const dirty = discoveryId !== model.discovery_policy_version_id
    || extractionId !== model.extraction_policy_version_id;

  return (
    <Card>
      <VersionHeading
        isDefault={model.is_default}
        name={model.name}
        status={model.status}
        version={model.version}
      />
      <CardContent className="space-y-4">
        {model.mutable ? (
          <div className="grid gap-3 md:grid-cols-2">
            <PolicySelect
              id={`model-discovery-${model.id}`}
              label="Política de discovery"
              onChange={setDiscoveryId}
              options={discoveryPolicies}
              value={discoveryId}
            />
            <PolicySelect
              id={`model-extraction-${model.id}`}
              label="Política de extração"
              onChange={setExtractionId}
              options={extractionPolicies}
              value={extractionId}
            />
          </div>
        ) : (
          <div className="grid gap-2 text-sm md:grid-cols-2">
            <p>Discovery: {model.discovery_policy.name} · v{model.discovery_policy.version}</p>
            <p>Extração: {model.extraction_policy.name} · v{model.extraction_policy.version}</p>
          </div>
        )}
        <p className="text-sm text-muted-foreground">
          {model.plan_reference_count} plano(s) e {model.execution_reference_count} execução(ões) referenciam esta versão.
        </p>
        <div className="flex flex-wrap gap-2">
          {model.status === "draft" && (
            <>
              <Button
                disabled={pending || !dirty}
                onClick={() => void execute(
                  () => updateOnboardingExecutionModelVersion(model.id, {
                    discovery_policy_version_id: discoveryId,
                    extraction_policy_version_id: extractionId,
                  }),
                  "Combinação salva.",
                  onReplace,
                )}
                type="button"
                variant="outline"
              >
                Salvar combinação
              </Button>
              <Button
                disabled={pending || dirty}
                onClick={() => void execute(
                  () => publishOnboardingExecutionModelVersion(model.id),
                  "Modelo de onboarding publicado.",
                  onReplace,
                )}
                type="button"
              >
                Publicar versão
              </Button>
              <Button
                disabled={pending}
                onClick={() => void execute(
                  () => archiveOnboardingExecutionModelVersion(model.id),
                  "Rascunho arquivado.",
                  onReplace,
                )}
                type="button"
                variant="outline"
              >
                Descartar rascunho
              </Button>
            </>
          )}
          {model.status !== "draft" && (
            <Button
              disabled={pending}
              onClick={() => void execute(
                () => createOnboardingExecutionModelVersionFrom(model.id),
                "Nova versão criada em rascunho.",
                onAdd,
              )}
              type="button"
              variant="outline"
            >
              Criar nova versão
            </Button>
          )}
          {model.status === "available" && !model.is_default && (
            <Button
              disabled={pending}
              onClick={() => void execute(
                () => makeOnboardingExecutionModelDefault(model.id),
                "Modelo definido como padrão global.",
                onReplace,
              )}
              type="button"
              variant="outline"
            >
              Definir como padrão
            </Button>
          )}
          {model.status === "available" && (
            <Button
              disabled={pending}
              onClick={() => void execute(
                () => archiveOnboardingExecutionModelVersion(model.id),
                "Modelo arquivado.",
                onReplace,
              )}
              type="button"
              variant="outline"
            >
              Arquivar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PolicySelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  options: Array<{ id: number; name: string; version: number }>;
  onChange: (id: number) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
        id={id}
        onChange={(event) => onChange(Number(event.target.value))}
        value={value}
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>{option.name} · v{option.version}</option>
        ))}
      </select>
    </div>
  );
}

export function OnboardingCatalogsClient({
  initialDiscoveryStrategies,
  initialDiscoveryPolicies,
  initialExtractionPolicies,
  initialModels,
}: OnboardingCatalogsClientProps) {
  const [strategies, setStrategies] = useState(initialDiscoveryStrategies);
  const [discoveryPolicies, setDiscoveryPolicies] = useState(initialDiscoveryPolicies);
  const [extractionPolicies, setExtractionPolicies] = useState(initialExtractionPolicies);
  const [models, setModels] = useState(initialModels);

  const replaceDiscovery = (updated: DiscoveryPolicyVersion) => {
    setDiscoveryPolicies((current) => current.map((item) => item.id === updated.id ? updated : item));
  };
  const replaceExtraction = (updated: ExtractionPolicyVersion) => {
    setExtractionPolicies((current) => current.map((item) => item.id === updated.id ? updated : item));
  };
  const adjustModelReferences = (
    previous: OnboardingExecutionModelVersion | undefined,
    next: OnboardingExecutionModelVersion,
  ) => {
    const previousActive = previous !== undefined && previous.status !== "archived";
    const nextActive = next.status !== "archived";

    setDiscoveryPolicies((current) => current.map((policy) => {
      const lostReference = previous?.discovery_policy_version_id === policy.id
        && previous.discovery_policy_version_id !== next.discovery_policy_version_id;
      const gainedReference = next.discovery_policy_version_id === policy.id
        && previous?.discovery_policy_version_id !== next.discovery_policy_version_id;
      const lostActiveReference = previousActive
        && previous?.discovery_policy_version_id === policy.id
        && (!nextActive || next.discovery_policy_version_id !== policy.id);
      const gainedActiveReference = nextActive
        && next.discovery_policy_version_id === policy.id
        && (!previousActive || previous?.discovery_policy_version_id !== policy.id);

      return {
        ...policy,
        model_reference_count: policy.model_reference_count
          - Number(lostReference)
          + Number(gainedReference),
        active_model_reference_count: policy.active_model_reference_count
          - Number(lostActiveReference)
          + Number(gainedActiveReference),
      };
    }));
    setExtractionPolicies((current) => current.map((policy) => {
      const lostReference = previous?.extraction_policy_version_id === policy.id
        && previous.extraction_policy_version_id !== next.extraction_policy_version_id;
      const gainedReference = next.extraction_policy_version_id === policy.id
        && previous?.extraction_policy_version_id !== next.extraction_policy_version_id;
      const lostActiveReference = previousActive
        && previous?.extraction_policy_version_id === policy.id
        && (!nextActive || next.extraction_policy_version_id !== policy.id);
      const gainedActiveReference = nextActive
        && next.extraction_policy_version_id === policy.id
        && (!previousActive || previous?.extraction_policy_version_id !== policy.id);

      return {
        ...policy,
        model_reference_count: policy.model_reference_count
          - Number(lostReference)
          + Number(gainedReference),
        active_model_reference_count: policy.active_model_reference_count
          - Number(lostActiveReference)
          + Number(gainedActiveReference),
      };
    }));
  };
  const replaceModel = (updated: OnboardingExecutionModelVersion) => {
    adjustModelReferences(models.find((item) => item.id === updated.id), updated);
    setModels((current) => current.map((item) => {
      if (item.id === updated.id) return updated;
      return updated.is_default && item.is_default ? { ...item, is_default: false } : item;
    }));
  };
  const addModel = (created: OnboardingExecutionModelVersion) => {
    adjustModelReferences(undefined, created);
    setModels((current) => [created, ...current]);
  };

  const availableDiscovery = discoveryPolicies.filter((policy) => policy.status === "available");
  const availableExtraction = extractionPolicies.filter((policy) => policy.status === "available");

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Modelos de execução de onboarding</h2>
        <p className="text-muted-foreground">
          Monte combinações nomeadas entre uma versão de discovery e uma versão de extração.
          Publicadas, as versões ficam imutáveis.
        </p>
      </div>
      <Tabs defaultValue="models">
        <TabsList>
          <TabsTrigger value="models">Modelos</TabsTrigger>
          <TabsTrigger value="discovery">Discovery</TabsTrigger>
          <TabsTrigger value="extraction">Extração</TabsTrigger>
        </TabsList>
        <TabsContent className="space-y-4" value="models">
          <ModelCreationCard
            discoveryPolicies={availableDiscovery}
            extractionPolicies={availableExtraction}
            onCreated={addModel}
          />
          {models.length === 0 && <EmptyCatalog text="Nenhum modelo de onboarding criado." />}
          {models.map((model) => (
            <ModelVersionCard
              discoveryPolicies={availableDiscovery}
              extractionPolicies={availableExtraction}
              key={model.id}
              model={model}
              onAdd={addModel}
              onReplace={replaceModel}
            />
          ))}
        </TabsContent>
        <TabsContent className="space-y-4" value="discovery">
          <DiscoveryCreationCard
            onCreated={(policy) => setDiscoveryPolicies((current) => [policy, ...current])}
            strategies={strategies}
          />
          <CustomStrategyCard
            onCreated={(strategy) => setStrategies((current) => [...current, strategy])}
          />
          {discoveryPolicies.length === 0 && <EmptyCatalog text="Nenhuma política de discovery criada." />}
          {discoveryPolicies.map((policy) => (
            <DiscoveryVersionCard
              key={policy.id}
              onAdd={(created) => setDiscoveryPolicies((current) => [created, ...current])}
              onReplace={replaceDiscovery}
              policy={policy}
              strategies={strategies}
            />
          ))}
        </TabsContent>
        <TabsContent className="space-y-4" value="extraction">
          <ExtractionCreationCard
            onCreated={(policy) => setExtractionPolicies((current) => [policy, ...current])}
          />
          {extractionPolicies.length === 0 && <EmptyCatalog text="Nenhuma política de extração criada." />}
          {extractionPolicies.map((policy) => (
            <ExtractionVersionCard
              key={policy.id}
              onAdd={(created) => setExtractionPolicies((current) => [created, ...current])}
              onReplace={replaceExtraction}
              policy={policy}
            />
          ))}
        </TabsContent>
      </Tabs>
    </section>
  );
}

function DiscoveryCreationCard({
  strategies,
  onCreated,
}: {
  strategies: DiscoveryStrategy[];
  onCreated: (policy: DiscoveryPolicyVersion) => void;
}) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [maxUrls, setMaxUrls] = useState(1000);
  const { pending, execute } = useCatalogAction();
  const options = strategies
    .filter((strategy) => strategy.active && strategy.safety_status === "safe")
    .map((strategy) => ({ key: strategy.key, label: strategy.label }));

  return (
    <Card>
      <CardHeader><CardTitle>Nova política de discovery</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[1fr_12rem]">
          <div className="space-y-2">
            <Label htmlFor="new-discovery-name">Nome da política</Label>
            <Input id="new-discovery-name" onChange={(event) => setName(event.target.value)} value={name} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-discovery-max">Limite de URLs</Label>
            <Input id="new-discovery-max" max={10000} min={1} onChange={(event) => setMaxUrls(event.target.valueAsNumber)} type="number" value={maxUrls} />
          </div>
        </div>
        <StrategyChoices onChange={setSelected} options={options} prefix="new-discovery" selected={selected} />
        <Button
          disabled={pending || name.trim() === "" || selected.length === 0}
          onClick={() => void execute(
            () => createDiscoveryPolicyVersion({
              name: name.trim(),
              strategies: selected,
              configuration: { max_urls: maxUrls },
            }),
            "Política criada em rascunho.",
            (created) => {
              onCreated(created);
              setName("");
              setSelected([]);
            },
          )}
          type="button"
        >
          Criar rascunho
        </Button>
      </CardContent>
    </Card>
  );
}

function CustomStrategyCard({ onCreated }: { onCreated: (strategy: DiscoveryStrategy) => void }) {
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [safety, setSafety] = useState<DiscoveryStrategy["safety_status"]>("safe");
  const { pending, execute } = useCatalogAction();

  return (
    <Card>
      <CardHeader><CardTitle>Registrar estratégia customizada</CardTitle></CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-[1fr_1fr_12rem_auto]">
        <div className="space-y-2">
          <Label htmlFor="strategy-key">Identificador</Label>
          <Input id="strategy-key" onChange={(event) => setKey(event.target.value)} placeholder="partner_feed" value={key} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="strategy-label">Nome</Label>
          <Input id="strategy-label" onChange={(event) => setLabel(event.target.value)} value={label} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="strategy-safety">Segurança</Label>
          <select
            className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
            id="strategy-safety"
            onChange={(event) => setSafety(event.target.value as DiscoveryStrategy["safety_status"])}
            value={safety}
          >
            <option value="safe">Segura</option>
            <option value="blocked">Bloqueada</option>
          </select>
        </div>
        <Button
          className="self-end"
          disabled={pending || key.trim() === "" || label.trim() === ""}
          onClick={() => void execute(
            () => createDiscoveryStrategy({
              key: key.trim(),
              label: label.trim(),
              safety_status: safety,
            }),
            "Estratégia registrada.",
            (created) => {
              onCreated(created);
              setKey("");
              setLabel("");
            },
          )}
          type="button"
          variant="outline"
        >
          Registrar
        </Button>
      </CardContent>
    </Card>
  );
}

function ExtractionCreationCard({
  onCreated,
}: {
  onCreated: (policy: ExtractionPolicyVersion) => void;
}) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<ExtractionStrategy[]>([]);
  const { pending, execute } = useCatalogAction();
  const updateSelection = (keys: string[]) => setSelected(
    extractionStrategies.map((strategy) => strategy.key).filter((key) => keys.includes(key)),
  );

  return (
    <Card>
      <CardHeader><CardTitle>Nova política de extração</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="max-w-xl space-y-2">
          <Label htmlFor="new-extraction-name">Nome da política</Label>
          <Input id="new-extraction-name" onChange={(event) => setName(event.target.value)} value={name} />
        </div>
        <p className="text-sm text-muted-foreground">
          O fallback sempre segue a ordem exibida. Selecione uma ou mais estratégias.
        </p>
        <StrategyChoices onChange={updateSelection} options={extractionStrategies} prefix="new-extraction" selected={selected} />
        <Button
          disabled={pending || name.trim() === "" || selected.length === 0}
          onClick={() => void execute(
            () => createExtractionPolicyVersion({
              name: name.trim(),
              strategies: selected,
              configuration: {},
            }),
            "Política criada em rascunho.",
            (created) => {
              onCreated(created);
              setName("");
              setSelected([]);
            },
          )}
          type="button"
        >
          Criar rascunho
        </Button>
      </CardContent>
    </Card>
  );
}

function ModelCreationCard({
  discoveryPolicies,
  extractionPolicies,
  onCreated,
}: {
  discoveryPolicies: DiscoveryPolicyVersion[];
  extractionPolicies: ExtractionPolicyVersion[];
  onCreated: (model: OnboardingExecutionModelVersion) => void;
}) {
  const [name, setName] = useState("");
  const [discoveryId, setDiscoveryId] = useState(discoveryPolicies[0]?.id ?? 0);
  const [extractionId, setExtractionId] = useState(extractionPolicies[0]?.id ?? 0);
  const { pending, execute } = useCatalogAction();
  const effectiveDiscoveryId = discoveryPolicies.some((policy) => policy.id === discoveryId)
    ? discoveryId
    : (discoveryPolicies[0]?.id ?? 0);
  const effectiveExtractionId = extractionPolicies.some((policy) => policy.id === extractionId)
    ? extractionId
    : (extractionPolicies[0]?.id ?? 0);
  const canCreate = name.trim() !== "" && effectiveDiscoveryId > 0 && effectiveExtractionId > 0;

  return (
    <Card>
      <CardHeader><CardTitle>Nova combinação de onboarding</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {discoveryPolicies.length === 0 || extractionPolicies.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Publique ao menos uma política de discovery e uma de extração para criar combinações.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="new-model-name">Nome da execução</Label>
              <Input id="new-model-name" onChange={(event) => setName(event.target.value)} value={name} />
            </div>
            <PolicySelect id="new-model-discovery" label="Política de discovery" onChange={setDiscoveryId} options={discoveryPolicies} value={effectiveDiscoveryId} />
            <PolicySelect id="new-model-extraction" label="Política de extração" onChange={setExtractionId} options={extractionPolicies} value={effectiveExtractionId} />
          </div>
        )}
        <Button
          disabled={pending || !canCreate}
          onClick={() => void execute(
            () => createOnboardingExecutionModelVersion({
              name: name.trim(),
              discovery_policy_version_id: effectiveDiscoveryId,
              extraction_policy_version_id: effectiveExtractionId,
            }),
            "Modelo criado em rascunho.",
            (created) => {
              onCreated(created);
              setName("");
            },
          )}
          type="button"
        >
          Criar combinação
        </Button>
      </CardContent>
    </Card>
  );
}

function EmptyCatalog({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">{text}</div>;
}
