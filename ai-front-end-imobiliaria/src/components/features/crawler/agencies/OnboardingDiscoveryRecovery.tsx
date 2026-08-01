"use client";

import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listOnboardingDiscoverySnapshotCandidates } from "@/services/crawlerService";
import type { OnboardingDiscoverySnapshotCandidate, OnboardingExecution } from "@/types/crawler";

import { AdoptDiscoverySnapshotButton } from "./AdoptDiscoverySnapshotButton";

interface OnboardingDiscoveryRecoveryProps {
  createCustomEnabled: boolean;
  execution: OnboardingExecution;
  onExecution: (execution: OnboardingExecution) => void;
  useExistingEnabled: boolean;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export function OnboardingDiscoveryRecovery({
  createCustomEnabled,
  execution,
  onExecution,
  useExistingEnabled,
}: OnboardingDiscoveryRecoveryProps) {
  const [open, setOpen] = useState(false);
  const [candidates, setCandidates] = useState<OnboardingDiscoverySnapshotCandidate[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");

  const loadCandidates = () => {
    setStatus("loading");
    void listOnboardingDiscoverySnapshotCandidates(execution.id)
      .then((items) => {
        setCandidates(items);
        setStatus("loaded");
      })
      .catch(() => setStatus("error"));
  };

  const toggleCandidates = () => {
    if (open) {
      setOpen(false);
      return;
    }

    setOpen(true);
    if (status === "loaded") return;
    loadCandidates();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {useExistingEnabled && (
          <Button onClick={toggleCandidates} type="button" variant="outline">
            {open ? "Ocultar Snapshots" : "Usar Snapshot existente"}
          </Button>
        )}
        {createCustomEnabled && (
          <Button asChild type="button" variant="outline">
            <Link href={`/admin/crawler/agencies/${execution.crawl_agency_id}/discoveries?onboarding_execution_id=${execution.id}`}>
              Criar Discovery personalizado
            </Link>
          </Button>
        )}
      </div>

      {open && (
        <section aria-label="Snapshots disponíveis para continuar o Onboarding" className="space-y-3 rounded-md border bg-background p-3">
          {status === "loading" && <p className="text-sm text-muted-foreground" role="status">Carregando Snapshots elegíveis…</p>}
          {status === "error" && (
            <div className="flex flex-wrap items-center justify-between gap-2" role="alert">
              <p className="text-sm text-destructive">Não foi possível carregar os Snapshots.</p>
              <Button onClick={loadCandidates} size="sm" type="button" variant="outline">Tentar novamente</Button>
            </div>
          )}
          {status === "loaded" && candidates.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum Snapshot desta Crawl Agency está disponível.</p>
          )}
          {candidates.map((candidate) => (
            <article className="space-y-2 rounded-md border p-3" key={candidate.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">Snapshot #{candidate.id}</p>
                  <p className="text-sm text-muted-foreground">{candidate.url_count} URLs · {formatDate(candidate.created_at)} · Operação #{candidate.operation_id}</p>
                </div>
                <Badge variant={candidate.adoption.eligible ? "secondary" : "outline"}>
                  {candidate.adoption.eligible ? "Elegível" : "Indisponível"}
                </Badge>
              </div>
              {candidate.adoption.sample_url && <p className="break-all text-sm">{candidate.adoption.sample_url}</p>}
              <AdoptDiscoverySnapshotButton
                candidate={candidate}
                executionId={execution.id}
                onAdopted={onExecution}
              />
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
