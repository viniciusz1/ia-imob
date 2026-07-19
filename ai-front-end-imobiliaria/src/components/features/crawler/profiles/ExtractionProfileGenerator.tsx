"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  queueExtractionProfileGeneration,
  queueSampleUrlSuggestion,
} from "@/services/crawlerService";
import type { CrawlerOperation, DiscoverySnapshot, MarketDataContract } from "@/types/crawler";
import { CrawlerOperationStatus } from "../CrawlerOperationStatus";
import { crawlerOperationErrorMessage } from "../crawlerOperationFeedback";
import { isActiveCrawlerOperation, useCrawlerOperationPolling } from "../useCrawlerOperationPolling";

interface ExtractionProfileGeneratorProps {
  agencyId: number;
  snapshots: DiscoverySnapshot[];
  contracts: MarketDataContract[];
  initialOperations?: CrawlerOperation[];
  initialSampleUrl?: string;
  onOperationChange?: (operation: CrawlerOperation) => void;
  onProfilesChanged?: () => void | Promise<void>;
  pollOperations?: boolean;
  primaryAction?: boolean;
}

function validHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function recoverableOperation(operations: CrawlerOperation[], type: string): CrawlerOperation | null {
  const latest = operations.find((operation) => operation.type === type);
  return latest && (isActiveCrawlerOperation(latest) || latest.state === "failed" || latest.state === "cancelled") ? latest : null;
}

export function ExtractionProfileGenerator({
  agencyId,
  snapshots,
  contracts,
  initialOperations = [],
  initialSampleUrl = "",
  onOperationChange,
  onProfilesChanged,
  pollOperations = true,
  primaryAction = true,
}: ExtractionProfileGeneratorProps) {
  const activeContracts = contracts.filter((contract) => contract.status === "active");
  const [snapshotId, setSnapshotId] = useState(snapshots[0]?.id.toString() ?? "");
  const [contractId, setContractId] = useState(activeContracts[0]?.id.toString() ?? "");
  const [sampleUrl, setSampleUrl] = useState(initialSampleUrl);
  const [confirmed, setConfirmed] = useState(false);
  const [suggestionOperation, setSuggestionOperation] = useState<CrawlerOperation | null>(() => recoverableOperation(initialOperations, "sample_url_suggestion"));
  const [generationOperation, setGenerationOperation] = useState<CrawlerOperation | null>(() => recoverableOperation(initialOperations, "profile_generation"));
  const handledTerminalOperations = useRef(new Set<number>());
  const isValidUrl = validHttpUrl(sampleUrl);

  useCrawlerOperationPolling({
    enabled: pollOperations,
    operations: [suggestionOperation, generationOperation].filter((operation): operation is CrawlerOperation => operation !== null),
    onError: (operationId, error) => toast.error(crawlerOperationErrorMessage(error, `Não foi possível atualizar a operação #${operationId}.`)),
    onOperation: (updated) => {
      if (updated.type === "sample_url_suggestion") setSuggestionOperation(updated);
      if (updated.type === "profile_generation") setGenerationOperation(updated);
      onOperationChange?.(updated);
      if (updated.state !== "succeeded" || handledTerminalOperations.current.has(updated.id)) return;
      handledTerminalOperations.current.add(updated.id);
      if (updated.type === "sample_url_suggestion") {
        const suggestion = updated.result?.sample_url;
        if (typeof suggestion === "string" && suggestion !== "") {
          setSampleUrl(suggestion);
          setConfirmed(false);
          toast.success("URL de amostra sugerida. Revise e confirme antes de gerar o perfil.");
        } else {
          toast.error("A operação terminou sem encontrar uma URL de amostra.");
        }
      }
      if (updated.type === "profile_generation") {
        toast.success("Perfil de Extração Candidato gerado.");
        void onProfilesChanged?.();
      }
    },
  });

  const suggest = async () => {
    try {
      const operation = await queueSampleUrlSuggestion(agencyId);
      setSuggestionOperation(operation);
      onOperationChange?.(operation);
      setConfirmed(false);
      toast.success(`Sugestão enfileirada como operação #${operation.id}.`);
    } catch (error) {
      toast.error(crawlerOperationErrorMessage(error, "Não foi possível sugerir uma URL de amostra."));
    }
  };

  const generate = async () => {
    if (!confirmed || !isValidUrl || !snapshotId || !contractId || (generationOperation && isActiveCrawlerOperation(generationOperation))) return;
    try {
      const operation = await queueExtractionProfileGeneration({
        crawl_agency_id: agencyId,
        discovery_snapshot_id: Number(snapshotId),
        market_data_contract_version_id: Number(contractId),
        sample_url: sampleUrl,
        sample_url_confirmed: true,
      });
      setGenerationOperation(operation);
      onOperationChange?.(operation);
      toast.success(`Geração do Perfil enfileirada como operação #${operation.id}.`);
    } catch (error) {
      toast.error(crawlerOperationErrorMessage(error, "Não foi possível gerar o Perfil de Extração."));
    }
  };

  if (snapshots.length === 0) {
    return <div className="rounded-md border border-dashed p-4"><p className="font-medium">Crie um Snapshot de Discovery antes de gerar um perfil.</p><p className="mt-1 text-sm text-muted-foreground">O perfil precisa fixar um conjunto reproduzível de URLs.</p><Link className="mt-3 inline-block underline underline-offset-4" href={`/admin/crawler/agencies/${agencyId}/discoveries`}>Criar Discovery</Link></div>;
  }

  if (activeContracts.length === 0) {
    return <div className="rounded-md border border-dashed p-4"><p className="font-medium">Ative um Contrato de Dados de Mercado antes de gerar um perfil.</p><Link className="mt-3 inline-block underline underline-offset-4" href="/admin/crawler/settings">Administrar contratos</Link></div>;
  }

  const generationActive = generationOperation !== null && isActiveCrawlerOperation(generationOperation);
  const disabledReason = generationActive
    ? "Já existe uma geração em andamento para esta Crawl Agency."
    : !sampleUrl
      ? "Informe ou solicite uma URL de amostra."
      : !isValidUrl
        ? "Informe uma URL http ou https válida."
        : !confirmed
          ? "Confirme a URL de amostra antes de gerar o perfil."
          : null;

  return (
    <div className="space-y-4" id="profile-generation">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1"><Label htmlFor={`profile-snapshot-${agencyId}`}>Snapshot de Discovery</Label><select aria-describedby={`profile-snapshot-help-${agencyId}`} className="h-10 w-full rounded-md border bg-transparent px-3 py-2" id={`profile-snapshot-${agencyId}`} value={snapshotId} onChange={(event) => setSnapshotId(event.target.value)}><option value="">Selecione um Discovery</option>{snapshots.map((snapshot) => <option key={snapshot.id} value={snapshot.id}>#{snapshot.id} · {snapshot.url_count} URLs</option>)}</select><p className="text-xs text-muted-foreground" id={`profile-snapshot-help-${agencyId}`}>Conjunto imutável de URLs usado para gerar e reproduzir esta versão.</p></div>
        <div className="space-y-1"><Label htmlFor={`profile-contract-${agencyId}`}>Contrato de Dados de Mercado</Label><select aria-describedby={`profile-contract-help-${agencyId}`} className="h-10 w-full rounded-md border bg-transparent px-3 py-2" id={`profile-contract-${agencyId}`} value={contractId} onChange={(event) => setContractId(event.target.value)}><option value="">Selecione o contrato</option>{activeContracts.map((contract) => <option key={contract.id} value={contract.id}>Versão {contract.version}</option>)}</select><p className="text-xs text-muted-foreground" id={`profile-contract-help-${agencyId}`}>Define os campos canônicos que o perfil deve extrair e normalizar.</p></div>
      </div>
      <div className="space-y-1"><Label htmlFor={`profile-sample-url-${agencyId}`}>URL de amostra</Label><div className="flex gap-2"><Input aria-describedby={`profile-sample-url-help-${agencyId}`} aria-invalid={sampleUrl !== "" && !isValidUrl} id={`profile-sample-url-${agencyId}`} type="url" value={sampleUrl} onChange={(event) => { setSampleUrl(event.target.value); setConfirmed(false); }} /><Button type="button" variant="outline" onClick={() => void suggest()} disabled={suggestionOperation !== null && isActiveCrawlerOperation(suggestionOperation)}>{suggestionOperation && isActiveCrawlerOperation(suggestionOperation) ? "Buscando…" : "Sugerir pela home"}</Button></div><p className="text-xs text-muted-foreground" id={`profile-sample-url-help-${agencyId}`}>Página de imóvel usada como referência pela geração dos seletores.</p>{sampleUrl !== "" && !isValidUrl && <p className="text-sm text-destructive">Informe uma URL http ou https válida.</p>}</div>
      <div className="flex items-center gap-2"><Checkbox aria-label="Confirmo a URL" id={`confirm-sample-url-${agencyId}`} checked={confirmed} onCheckedChange={(checked) => setConfirmed(checked === true)} /><Label htmlFor={`confirm-sample-url-${agencyId}`}>Confirmo a URL de amostra</Label></div>
      <Button data-primary-action={primaryAction ? "true" : undefined} disabled={disabledReason !== null} onClick={() => void generate()} type="button" variant={primaryAction ? "default" : "outline"}>Gerar Perfil Candidato</Button>
      {disabledReason && !(sampleUrl !== "" && !isValidUrl) && <p className="text-sm text-muted-foreground">{disabledReason}</p>}
      {suggestionOperation && <CrawlerOperationStatus agencyId={agencyId} operation={suggestionOperation} />}
      {generationOperation && <CrawlerOperationStatus agencyId={agencyId} operation={generationOperation} />}
    </div>
  );
}
