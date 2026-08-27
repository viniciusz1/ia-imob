"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PrototypeSwitcher } from "@/components/ui/PrototypeSwitcher";
import { listExtractionProfiles } from "@/services/crawlerService";
import type {
  CrawlAgency,
  CrawlerOperation,
  DiscoverySnapshot,
  ExtractionProfile,
  MarketDataContract,
} from "@/types/crawler";

import { crawlerOperationErrorMessage } from "../crawlerOperationFeedback";
import { isActiveCrawlerOperation, useCrawlerOperationPolling } from "../useCrawlerOperationPolling";
import { ExtractionProfileGenerator } from "./ExtractionProfileGenerator";
import { ProfileValidationPanel } from "./ProfileValidationPanel";
import type { SampleUrlPrototypeVariant } from "./SampleUrlPickerPrototype";

interface ExtractionProfilesWorkspaceProps {
  agency: CrawlAgency;
  contracts: MarketDataContract[];
  initialOperations: CrawlerOperation[];
  initialProfiles: ExtractionProfile[];
  snapshots: DiscoverySnapshot[];
  prototypeVariant?: SampleUrlPrototypeVariant;
}

const profileOperationTypes = ["sample_url_suggestion", "profile_generation", "profile_validation"];

export function ExtractionProfilesWorkspace({
  agency,
  contracts,
  initialOperations,
  initialProfiles,
  snapshots,
  prototypeVariant,
}: ExtractionProfilesWorkspaceProps) {
  const [lifecycle, setLifecycle] = useState(agency.lifecycle_state);
  const [operations, setOperations] = useState(initialOperations);
  const [profiles, setProfiles] = useState(initialProfiles);
  const [generationOpen, setGenerationOpen] = useState(() => (
    snapshots.length > 0 && initialProfiles.every((profile) => profile.status === "rejected")
  ));
  const orderedProfiles = useMemo(() => [...profiles].sort((left, right) => right.version - left.version), [profiles]);
  const hasCurrentProfile = orderedProfiles.some((profile) => profile.status !== "rejected");
  const activeOperation = operations.find((candidate) => (
    profileOperationTypes.includes(candidate.type) && isActiveCrawlerOperation(candidate)
  )) ?? null;

  const updateOperation = useCallback((updated: CrawlerOperation) => {
    setOperations((current) => {
      const exists = current.some((operation) => operation.id === updated.id);
      return exists
        ? current.map((operation) => operation.id === updated.id ? updated : operation)
        : [updated, ...current];
    });
  }, []);

  const reloadProfiles = useCallback(async () => {
    setProfiles(await listExtractionProfiles(agency.id));
  }, [agency.id]);

  const generatorOwnsPolling = generationOpen
    && activeOperation !== null
    && (activeOperation.type === "sample_url_suggestion" || activeOperation.type === "profile_generation");
  useCrawlerOperationPolling({
    enabled: !generatorOwnsPolling,
    operations: activeOperation ? [activeOperation] : [],
    onError: (operationId, error) => toast.error(crawlerOperationErrorMessage(error, `Não foi possível atualizar a operação #${operationId}.`)),
    onOperation: (updated) => {
      updateOperation(updated);
      if (updated.state === "succeeded" && (updated.type === "profile_generation" || updated.type === "profile_validation")) {
        void reloadProfiles();
      }
    },
  });

  const updateProfile = (updated: ExtractionProfile) => {
    setProfiles((current) => current.map((profile) => {
      if (profile.id === updated.id) return updated;
      if (updated.status === "active" && profile.status === "active") {
        return { ...profile, status: "approved" };
      }
      return profile;
    }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <div><CardTitle>Gerar Perfil Candidato</CardTitle><CardDescription>{snapshots.length === 0 ? "Crie um Snapshot de Discovery antes de gerar um perfil." : hasCurrentProfile ? "Fluxo alternativo para criar uma nova versão." : "Prepare uma URL de amostra e gere o primeiro Perfil de Extração Candidato."}</CardDescription></div>
          {snapshots.length > 0 && hasCurrentProfile && <Button onClick={() => setGenerationOpen((current) => !current)} type="button" variant="outline">{generationOpen ? "Ocultar formulário" : "Mostrar formulário"}</Button>}
        </CardHeader>
        {snapshots.length === 0 && <CardContent><Button asChild variant="outline"><Link href={`/admin/crawler/agencies/${agency.id}/discoveries`}>Criar Discovery</Link></Button></CardContent>}
        {generationOpen && <CardContent><ExtractionProfileGenerator agencyId={agency.id} contracts={contracts} initialOperations={operations} onOperationChange={updateOperation} onProfilesChanged={reloadProfiles} primaryAction={!hasCurrentProfile} prototypeVariant={prototypeVariant} snapshots={snapshots} /></CardContent>}
      </Card>

      <Card>
        <CardHeader><CardTitle>Perfis de Extração</CardTitle><CardDescription>Escolha entre as versões, revise validações e ative o perfil que deve orientar os próximos crawls.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {orderedProfiles.length === 0
            ? <p className="text-muted-foreground">Nenhum Perfil de Extração foi gerado. Gere um perfil candidato acima.</p>
            : orderedProfiles.map((profile) => (
              <ProfileValidationPanel
                agencyLifecycle={lifecycle}
                initialOperations={operations}
                initialProfile={profile}
                key={profile.id}
                onLifecycleChange={setLifecycle}
                onOperationChange={updateOperation}
                onProfileChange={updateProfile}
                pollOperations={false}
              />
            ))}
        </CardContent>
      </Card>
      {prototypeVariant && <PrototypeSwitcher current={prototypeVariant} variants={[{ key: "A", name: "Lista inline" }, { key: "B", name: "Escolha da origem" }, { key: "C", name: "Busca em modal" }]} />}
    </div>
  );
}
