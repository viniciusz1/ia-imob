"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { CrawlerOperationStatus } from "@/components/features/crawler/CrawlerOperationStatus";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
      <div className="space-y-4 rounded-lg border border-amber-300 bg-amber-50/60 p-4">
        <div className="space-y-1">
          <p className="font-medium">Validação controlada pelo Onboarding</p>
          <p className="text-sm text-muted-foreground">Existe uma Execução de Onboarding ativa. Para preservar a sequência, as tentativas e o histórico, este Crawl de Validação deve ser iniciado ou retomado no Onboarding.</p>
          <p className="text-sm">Execução #{activeOnboarding.id} · etapa atual: {activeOnboarding.current_step}</p>
          {validationOperation && <p className="text-sm">Operação de validação #{validationOperation.id} · {validationOperation.state}</p>}
        </div>
        <div className="flex flex-wrap gap-3">
          {canExecute && <Button aria-describedby="onboarding-validation-reason" disabled type="button">Rodar Crawl de Validação</Button>}
          <Button asChild variant="outline"><Link href={`/admin/crawler/agencies/${agencyId}/onboarding/${activeOnboarding.id}`}>Abrir Onboarding</Link></Button>
        </div>
        <p className="sr-only" id="onboarding-validation-reason">A validação deve ser comandada pela Execução de Onboarding ativa.</p>
      </div>
    );
  }

  if (eligibleProfiles.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum Perfil de Extração Candidato ou com Revalidação Necessária está disponível.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="validation-profile">Perfil de Extração</Label>
        <select
          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          disabled={!canExecute || pending || activeOperation !== null}
          id="validation-profile"
          onChange={(event) => setProfileId(Number(event.target.value))}
          value={profileId ?? ""}
        >
          {eligibleProfiles.map((profile) => <option key={profile.id} value={profile.id}>Perfil v{profile.version} · {profile.status === "candidate" ? "Candidato" : "Revalidação necessária"}</option>)}
        </select>
      </div>
      {selectedProfile && <dl className="grid gap-3 rounded-lg border bg-muted/20 p-4 text-sm sm:grid-cols-3"><div><dt className="text-muted-foreground">Snapshot de Discovery</dt><dd>#{selectedProfile.discovery_snapshot_id}</dd></div><div><dt className="text-muted-foreground">Contrato de Dados</dt><dd>#{selectedProfile.market_data_contract_version_id}</dd></div><div><dt className="text-muted-foreground">Criado em</dt><dd>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(selectedProfile.created_at))}</dd></div></dl>}
      {activeOperation && <CrawlerOperationStatus agencyId={agencyId} operation={activeOperation} />}
      {canExecute && <Button disabled={pending || activeOperation !== null} onClick={() => void queue()} type="button">{pending ? "Enfileirando…" : activeOperation ? "Validação em andamento" : "Rodar Crawl de Validação"}</Button>}
    </div>
  );
}
