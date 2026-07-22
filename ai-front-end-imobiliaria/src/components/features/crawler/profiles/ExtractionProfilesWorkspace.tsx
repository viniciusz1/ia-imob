"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import { CrawlerOperationStatus } from "@/components/features/crawler/CrawlerOperationStatus";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  activateCrawlAgency,
  activateExtractionProfile,
  listExtractionProfiles,
  queueProfileValidation,
} from "@/services/crawlerService";
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

interface ExtractionProfilesWorkspaceProps {
  agency: CrawlAgency;
  contracts: MarketDataContract[];
  initialOperations: CrawlerOperation[];
  initialProfiles: ExtractionProfile[];
  snapshots: DiscoverySnapshot[];
}

const profileOperationTypes = ["sample_url_suggestion", "profile_generation", "profile_validation"];

type NextAction =
  | { kind: "operation"; operation: CrawlerOperation }
  | { kind: "discovery" }
  | { kind: "generate" }
  | { kind: "validate"; profile: ExtractionProfile }
  | { kind: "decide"; profile: ExtractionProfile }
  | { kind: "activate-profile"; profile: ExtractionProfile }
  | { kind: "activate-agency"; profile: ExtractionProfile }
  | { kind: "ready" };

function nextAction(
  lifecycle: CrawlAgency["lifecycle_state"],
  snapshots: DiscoverySnapshot[],
  profiles: ExtractionProfile[],
  operations: CrawlerOperation[],
): NextAction {
  const operation = operations.find((candidate) => profileOperationTypes.includes(candidate.type) && isActiveCrawlerOperation(candidate));
  if (operation) return { kind: "operation", operation };
  if (snapshots.length === 0) return { kind: "discovery" };

  const current = profiles.find((profile) => profile.status !== "rejected");
  if (!current) return { kind: "generate" };
  if (current.status === "candidate" || current.status === "revalidation_required") {
    return current.latest_validation_report ? { kind: "decide", profile: current } : { kind: "validate", profile: current };
  }
  if (current.status === "approved") return { kind: "activate-profile", profile: current };
  if (current.status === "active" && lifecycle === "onboarding") return { kind: "activate-agency", profile: current };
  return { kind: "ready" };
}

function terminalProfileOperation(operations: CrawlerOperation[]): CrawlerOperation | null {
  return operations.find((operation) => (
    profileOperationTypes.includes(operation.type)
    && (operation.state === "failed" || operation.state === "cancelled")
  )) ?? null;
}

export function ExtractionProfilesWorkspace({
  agency,
  contracts,
  initialOperations,
  initialProfiles,
  snapshots,
}: ExtractionProfilesWorkspaceProps) {
  const [lifecycle, setLifecycle] = useState(agency.lifecycle_state);
  const [operations, setOperations] = useState(initialOperations);
  const [profiles, setProfiles] = useState(initialProfiles);
  const [generationOpen, setGenerationOpen] = useState(false);
  const [decisionProfileId, setDecisionProfileId] = useState<number | null>(null);
  const [pendingAction, setPendingAction] = useState<"validate" | "activate-profile" | "activate-agency" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const orderedProfiles = useMemo(() => [...profiles].sort((left, right) => right.version - left.version), [profiles]);
  const action = nextAction(lifecycle, snapshots, orderedProfiles, operations);
  const terminalOperation = terminalProfileOperation(operations);

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

  const activeOperation = action.kind === "operation" ? action.operation : null;
  const generatorOwnsPolling = generationOpen
    && activeOperation !== null
    && (activeOperation.type === "sample_url_suggestion" || activeOperation.type === "profile_generation");
  useCrawlerOperationPolling({
    enabled: !generatorOwnsPolling,
    operations: activeOperation ? [activeOperation] : [],
    onError: (operationId, error) => setActionError(crawlerOperationErrorMessage(error, `Não foi possível atualizar a operação #${operationId}.`)),
    onOperation: (updated) => {
      updateOperation(updated);
      if (updated.state === "succeeded" && (updated.type === "profile_generation" || updated.type === "profile_validation")) {
        void reloadProfiles();
      }
    },
  });

  const validate = async (profile: ExtractionProfile) => {
    setPendingAction("validate");
    setActionError(null);
    try {
      updateOperation(await queueProfileValidation(profile.id));
    } catch (error) {
      setActionError(crawlerOperationErrorMessage(error, "Não foi possível iniciar o Crawl de Validação."));
    } finally {
      setPendingAction(null);
    }
  };

  const activateProfile = async (profile: ExtractionProfile) => {
    setPendingAction("activate-profile");
    setActionError(null);
    try {
      const updated = await activateExtractionProfile(profile.id);
      setProfiles((current) => current.map((candidate) => candidate.id === updated.id ? updated : candidate));
    } catch (error) {
      setActionError(crawlerOperationErrorMessage(error, "Não foi possível ativar o Perfil de Extração."));
    } finally {
      setPendingAction(null);
    }
  };

  const activateAgency = async () => {
    setPendingAction("activate-agency");
    setActionError(null);
    try {
      const updated = await activateCrawlAgency(agency.id);
      setLifecycle(updated.lifecycle_state);
    } catch (error) {
      setActionError(crawlerOperationErrorMessage(error, "Não foi possível ativar a Crawl Agency."));
    } finally {
      setPendingAction(null);
    }
  };

  const updateProfile = (updated: ExtractionProfile) => {
    setProfiles((current) => current.map((profile) => profile.id === updated.id ? updated : profile));
    setDecisionProfileId(null);
  };

  return (
    <div className="space-y-6">
      <Card className="border-primary/40 bg-primary/5" aria-labelledby="profiles-next-action">
        <CardHeader>
          <CardTitle id="profiles-next-action">Próxima ação</CardTitle>
          <CardDescription>
            {action.kind === "operation" && "Acompanhe a operação atual antes de iniciar uma ação equivalente."}
            {action.kind === "discovery" && "Esta Crawl Agency precisa de um Snapshot de Discovery antes que um perfil reproduzível possa ser gerado."}
            {action.kind === "generate" && "O Discovery está pronto. Prepare a URL de amostra e gere um Perfil de Extração Candidato."}
            {action.kind === "validate" && `O Perfil v${action.profile.version} ainda precisa passar pelo Crawl de Validação.`}
            {action.kind === "decide" && `O relatório do Perfil v${action.profile.version} está disponível para uma decisão humana justificada.`}
            {action.kind === "activate-profile" && `O Perfil v${action.profile.version} foi aprovado e pode ser ativado.`}
            {action.kind === "activate-agency" && "O perfil ativo conclui o preparo técnico; falta ativar a Crawl Agency."}
            {action.kind === "ready" && "Nenhuma ação humana pendente. A Crawl Agency e seu Perfil de Extração estão ativos."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {action.kind === "operation" && <CrawlerOperationStatus agencyId={agency.id} operation={action.operation} />}
          {action.kind === "discovery" && <Button asChild><Link data-primary-action="true" href={`/admin/crawler/agencies/${agency.id}/discoveries`}>Criar Discovery</Link></Button>}
          {action.kind === "generate" && !generationOpen && <Button data-primary-action="true" onClick={() => setGenerationOpen(true)} type="button">Preparar geração</Button>}
          {action.kind === "generate" && generationOpen && <p className="text-sm">Conclua o formulário de geração aberto abaixo.</p>}
          {action.kind === "validate" && <Button data-primary-action="true" disabled={pendingAction !== null} onClick={() => void validate(action.profile)} type="button">{pendingAction === "validate" ? "Enfileirando validação…" : "Rodar Crawl de Validação"}</Button>}
          {action.kind === "decide" && decisionProfileId !== action.profile.id && <Button data-primary-action="true" onClick={() => setDecisionProfileId(action.profile.id)} type="button">Registrar decisão</Button>}
          {action.kind === "decide" && decisionProfileId === action.profile.id && <p className="text-sm">Registre a aprovação ou rejeição no histórico do perfil abaixo.</p>}
          {action.kind === "activate-profile" && <Button data-primary-action="true" disabled={pendingAction !== null} onClick={() => void activateProfile(action.profile)} type="button">{pendingAction === "activate-profile" ? "Ativando Perfil…" : "Ativar Perfil de Extração"}</Button>}
          {action.kind === "activate-agency" && <Button data-primary-action="true" disabled={pendingAction !== null} onClick={() => void activateAgency()} type="button">{pendingAction === "activate-agency" ? "Ativando Crawl Agency…" : "Ativar Crawl Agency"}</Button>}
          {actionError && <p className="text-sm text-destructive" role="alert">{actionError}</p>}
          {action.kind !== "operation" && terminalOperation && <CrawlerOperationStatus agencyId={agency.id} operation={terminalOperation} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <div><CardTitle>Gerar Perfil Candidato</CardTitle><CardDescription>Fluxo alternativo para criar uma nova versão.</CardDescription></div>
          {action.kind !== "generate" && <Button onClick={() => setGenerationOpen((current) => !current)} type="button" variant="outline">{generationOpen ? "Ocultar formulário" : "Mostrar formulário"}</Button>}
        </CardHeader>
        {generationOpen && <CardContent><ExtractionProfileGenerator agencyId={agency.id} contracts={contracts} initialOperations={operations} onOperationChange={updateOperation} onProfilesChanged={reloadProfiles} primaryAction={action.kind === "generate"} snapshots={snapshots} /></CardContent>}
      </Card>

      <Card>
        <CardHeader><CardTitle>Versões do perfil</CardTitle><CardDescription>Histórico versionado, validações e decisões auditáveis.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {orderedProfiles.length === 0
            ? <p className="text-muted-foreground">Nenhum Perfil de Extração foi gerado. Use a próxima ação indicada acima.</p>
            : orderedProfiles.map((profile) => (
              <ProfileValidationPanel
                agencyLifecycle={lifecycle}
                allowDecision={decisionProfileId === profile.id}
                initiallyExpanded={decisionProfileId === profile.id}
                initialOperations={operations}
                initialProfile={profile}
                hideWorkflowActions
                key={profile.id}
                onLifecycleChange={setLifecycle}
                onOperationChange={updateOperation}
                onProfileChange={updateProfile}
                pollOperations={false}
              />
            ))}
        </CardContent>
      </Card>
    </div>
  );
}
