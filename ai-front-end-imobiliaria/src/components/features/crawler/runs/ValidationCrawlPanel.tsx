"use client";

import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { CrawlerOperationStatus } from "@/components/features/crawler/CrawlerOperationStatus";
import { OperationStateBadge } from "@/components/features/crawler/CrawlerStatusBadges";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { NativeSelect } from "@/components/ui/native-select";
import { usePermission } from "@/hooks/usePermission";
import { queueProfileValidation } from "@/services/crawlerService";
import type { CrawlerOperation, ExtractionProfile, OnboardingExecution } from "@/types/crawler";

import { crawlerOperationErrorMessage } from "../crawlerOperationFeedback";
import { isActiveCrawlerOperation, useCrawlerOperationPolling } from "../useCrawlerOperationPolling";

interface ValidationCrawlPanelProps {
  agencyId: number;
  activeOnboarding: Pick<OnboardingExecution, "id" | "current_step" | "operations"> | null;
  initialOperations: CrawlerOperation[];
  profiles: ExtractionProfile[];
}

function operationProfileId(operation: CrawlerOperation): number | null {
  const value = operation.plan.extraction_profile_id;
  return typeof value === "number" ? value : null;
}

export function ValidationCrawlPanel({ agencyId, activeOnboarding, initialOperations, profiles }: ValidationCrawlPanelProps) {
  const eligibleProfiles = useMemo(
    () => profiles
      .filter((profile) => profile.status === "candidate" || profile.status === "revalidation_required")
      .sort((left, right) => right.version - left.version),
    [profiles],
  );
  const [profileId, setProfileId] = useState(eligibleProfiles[0]?.id ?? null);
  const [operations, setOperations] = useState(initialOperations.filter((operation) => operation.type === "profile_validation"));
  const [pending, setPending] = useState(false);
  const canExecute = usePermission("crawler.operations.execute");
  const selectedProfile = eligibleProfiles.find((profile) => profile.id === profileId) ?? null;
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
      const operation = await queueProfileValidation(selectedProfile.id);
      setOperations((current) => [operation, ...current.filter((candidate) => candidate.id !== operation.id)]);
      toast.success(`Crawl de Validação enfileirado como operação #${operation.id}.`);
    } catch (error: unknown) {
      toast.error(crawlerOperationErrorMessage(error, "Não foi possível iniciar o Crawl de Validação."));
    } finally {
      setPending(false);
    }
  };

  if (activeOnboarding) {
    const validationOperation = [...activeOnboarding.operations]
      .reverse()
      .find((operation) => operation.step === "profile_validation");

    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
          <div className="min-w-0 space-y-1">
            <p className="text-foreground">Validação controlada pelo Onboarding</p>
            <p className="text-muted-foreground">
              Existe uma Execução de Onboarding ativa. Para preservar a sequência, as tentativas e o histórico, este
              Crawl de Validação deve ser iniciado ou retomado no Onboarding.
            </p>
          </div>
        </div>
        <dl className="grid gap-4 rounded-lg border p-4 text-sm sm:grid-cols-2">
          <div className="space-y-1">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Execução de Onboarding</dt>
            <dd className="tabular-nums">#{activeOnboarding.id} · etapa atual: {activeOnboarding.current_step}</dd>
          </div>
          {validationOperation && (
            <div className="space-y-1">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Operação de validação</dt>
              <dd className="flex flex-wrap items-center gap-2">
                <span className="tabular-nums">#{validationOperation.id}</span>
                <OperationStateBadge state={validationOperation.state} />
              </dd>
            </div>
          )}
        </dl>
        <div className="flex flex-wrap gap-3">
          {canExecute && (
            <Button aria-describedby="onboarding-validation-reason" disabled type="button">
              Rodar Crawl de Validação
            </Button>
          )}
          <Button asChild variant="outline">
            <Link href={`/admin/crawler/agencies/${agencyId}/onboarding/${activeOnboarding.id}`}>Abrir Onboarding</Link>
          </Button>
        </div>
        <p className="sr-only" id="onboarding-validation-reason">
          A validação deve ser comandada pela Execução de Onboarding ativa.
        </p>
      </div>
    );
  }

  if (eligibleProfiles.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum Perfil de Extração Candidato ou com Revalidação Necessária está disponível.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <FormField htmlFor="validation-profile" label="Perfil de Extração">
        <NativeSelect
          disabled={!canExecute || pending || activeOperation !== null}
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
        <dl className="grid gap-4 rounded-lg border p-4 text-sm sm:grid-cols-3">
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
      {activeOperation && <CrawlerOperationStatus agencyId={agencyId} operation={activeOperation} />}
      {canExecute && (
        <Button disabled={pending || activeOperation !== null} onClick={() => void queue()} type="button">
          {pending ? "Enfileirando…" : activeOperation ? "Validação em andamento" : "Rodar Crawl de Validação"}
        </Button>
      )}
    </div>
  );
}
