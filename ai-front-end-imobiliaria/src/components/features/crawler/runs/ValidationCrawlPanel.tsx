"use client";

import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { CrawlerOperationStatus } from "@/components/features/crawler/CrawlerOperationStatus";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { MissingFieldsHint, missingFields } from "@/components/features/crawler/requiredFields";
import { usePermission } from "@/hooks/usePermission";
import { activateExtractionProfile, queueProfileValidation } from "@/services/crawlerService";
import type { CrawlerOperation, ExtractionProfile, OnboardingExecution } from "@/types/crawler";

import { crawlerOperationErrorMessage } from "../crawlerOperationFeedback";
import { isActiveCrawlerOperation, useCrawlerOperationPolling } from "../useCrawlerOperationPolling";

interface ValidationCrawlPanelProps {
  agencyId: number;
  activeOnboarding: Pick<OnboardingExecution, "id" | "current_step" | "operations"> | null;
  initialOperations: CrawlerOperation[];
  profiles: ExtractionProfile[];
  onProfileChange?: (profile: ExtractionProfile) => void;
}

function operationProfileId(operation: CrawlerOperation): number | null {
  const value = operation.plan.extraction_profile_id;
  return typeof value === "number" ? value : null;
}

export function ValidationCrawlPanel({ agencyId, activeOnboarding, initialOperations, profiles, onProfileChange }: ValidationCrawlPanelProps) {
  const [profileList, setProfileList] = useState(profiles);
  const [activating, setActivating] = useState(false);
  const canExecute = usePermission("crawler.operations.execute");
  const canActivate = usePermission(["crawler.profiles.approve", "crawler.operations.execute"]);

  useEffect(() => {
    setProfileList(profiles);
  }, [profiles]);

  const eligibleProfiles = useMemo(
    () => profileList
      .filter((profile) => profile.status === "candidate" || profile.status === "revalidation_required")
      .sort((left, right) => right.version - left.version),
    [profileList],
  );
  const [profileId, setProfileId] = useState(eligibleProfiles[0]?.id ?? null);
  const [linkToOnboarding, setLinkToOnboarding] = useState(true);
  const [operations, setOperations] = useState(initialOperations.filter((operation) => operation.type === "profile_validation"));
  const [pending, setPending] = useState(false);
  const selectedProfile = eligibleProfiles.find((profile) => profile.id === profileId) ?? null;
  const latestOperation = operations.find((operation) => operationProfileId(operation) === profileId) ?? null;
  const activeOperation = operations.find((operation) => operationProfileId(operation) === profileId && isActiveCrawlerOperation(operation)) ?? null;

  useCrawlerOperationPolling({
    operations: activeOperation ? [activeOperation] : [],
    onError: (_operationId, error) => toast.error(crawlerOperationErrorMessage(error, "Não foi possível atualizar a validação.")),
    onOperation: (updated) => setOperations((current) => current.map((operation) => operation.id === updated.id ? updated : operation)),
  });

  const queue = async () => {
    if (!selectedProfile) return;
    setPending(true);
    try {
      const operation = activeOnboarding
        ? await queueProfileValidation(selectedProfile.id, {
            linkToOnboarding,
            standalone: !linkToOnboarding,
          })
        : await queueProfileValidation(selectedProfile.id);
      setOperations((current) => [operation, ...current.filter((candidate) => candidate.id !== operation.id)]);
      if (activeOnboarding && linkToOnboarding) {
        toast.success(`Crawl de Validação enfileirado como operação #${operation.id} e vinculado ao Onboarding #${activeOnboarding.id}.`);
      } else {
        toast.success(`Crawl de Validação enfileirado como operação #${operation.id}.`);
      }
    } catch (error: unknown) {
      toast.error(crawlerOperationErrorMessage(error, "Não foi possível iniciar o Crawl de Validação."));
    } finally {
      setPending(false);
    }
  };

  const activateSelectedProfile = async () => {
    if (!selectedProfile) return;
    setActivating(true);
    try {
      const updated = await activateExtractionProfile(selectedProfile.id);
      setProfileList((current) => current.map((p) => p.id === updated.id ? updated : (p.status === "active" ? { ...p, status: "approved" as const } : p)));
      onProfileChange?.(updated);
      toast.success(`Perfil v${selectedProfile.version} ativado com sucesso.`);
    } catch (error: unknown) {
      toast.error(crawlerOperationErrorMessage(error, "Não foi possível ativar o Perfil de Extração."));
    } finally {
      setActivating(false);
    }
  };

  if (eligibleProfiles.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum Perfil de Extração Candidato ou com Revalidação Necessária está disponível.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {activeOnboarding && (
        <div className="space-y-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
              <div className="min-w-0 space-y-1">
                <p className="text-foreground">Validação integrada ao Onboarding</p>
                <p className="text-muted-foreground">
                  Existe uma Execução de Onboarding ativa (#{activeOnboarding.id} · etapa: {activeOnboarding.current_step}).
                  Você pode selecionar o perfil desejado abaixo para validar e associar a esta execução.
                </p>
              </div>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href={`/admin/crawler/agencies/${agencyId}/onboarding/${activeOnboarding.id}`}>Abrir Onboarding</Link>
            </Button>
          </div>
          <div className="flex items-center gap-2 pl-7">
            <Checkbox
              checked={linkToOnboarding}
              id="link-to-onboarding"
              onCheckedChange={(checked) => setLinkToOnboarding(checked === true)}
            />
            <Label className="cursor-pointer text-xs font-normal" htmlFor="link-to-onboarding">
              Vincular este Crawl de Validação à Execução de Onboarding #{activeOnboarding.id}
            </Label>
          </div>
        </div>
      )}

      <FormField htmlFor="validation-profile" label="Perfil de Extração">
        <NativeSelect
          disabled={!canExecute || pending || activeOperation !== null || activating}
          id="validation-profile"
          onChange={(event) => setProfileId(Number(event.target.value))}
          value={profileId ?? ""}
        >
          {eligibleProfiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              Perfil v{profile.version} · {profile.status === "candidate" ? "Candidato" : "Revalidação necessária"}
            </option>
          ))}
        </NativeSelect>
      </FormField>
      {selectedProfile && (
        <dl className="grid gap-4 rounded-xl border border-transparent bg-muted p-4 text-sm sm:grid-cols-3">
          <div className="space-y-1">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Snapshot de Discovery</dt>
            <dd className="tabular-nums">#{selectedProfile.discovery_snapshot_id}</dd>
          </div>
          <div className="space-y-1">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Contrato de Dados</dt>
            <dd className="tabular-nums">#{selectedProfile.market_data_contract_version_id}</dd>
          </div>
          <div className="space-y-1">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Criado em</dt>
            <dd className="tabular-nums">
              {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(selectedProfile.created_at))}
            </dd>
          </div>
        </dl>
      )}
      {(activeOperation || latestOperation?.state === "succeeded") && (
        <CrawlerOperationStatus operation={activeOperation ?? latestOperation!} />
      )}
      <div className="flex flex-wrap items-center gap-2">
        {canExecute && (
          <Button
            disabled={!profileId || pending || activeOperation !== null || activating}
            onClick={() => void queue()}
            type="button"
          >
            {pending ? "Enfileirando…" : activeOperation ? "Validação em andamento" : "Rodar Crawl de Validação"}
          </Button>
        )}
        {canActivate && selectedProfile && selectedProfile.status !== "active" && (
          <Button
            disabled={pending || activeOperation !== null || activating}
            onClick={() => void activateSelectedProfile()}
            type="button"
            variant="outline"
          >
            {activating ? "Ativando…" : "Ativar Perfil"}
          </Button>
        )}
        {canExecute && <MissingFieldsHint missing={missingFields([["Perfil de extração", Boolean(profileId)]])} />}
      </div>
    </div>
  );
}
