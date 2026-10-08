"use client";

import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  queueExtractionProfileGeneration,
  queueSampleUrlSuggestion,
} from "@/services/crawlerService";
import type { CrawlerOperation, DiscoverySnapshot, MarketDataContract } from "@/types/crawler";
import { CrawlerOperationStatus } from "../CrawlerOperationStatus";
import { crawlerOperationErrorMessage } from "../crawlerOperationFeedback";
import { isActiveCrawlerOperation, useCrawlerOperationPolling } from "../useCrawlerOperationPolling";
import { SampleUrlPickerPrototype, type SampleUrlPrototypeVariant } from "./SampleUrlPickerPrototype";

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
  prototypeVariant?: SampleUrlPrototypeVariant;
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
  prototypeVariant,
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
    return (
      <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
        <TriangleAlert className="size-4 shrink-0 text-warning" />
        <div className="space-y-1">
          <p className="text-foreground">Crie um Snapshot de Discovery antes de gerar um perfil.</p>
          <p className="text-muted-foreground">O perfil precisa fixar um conjunto reproduzível de URLs.</p>
          <Link className="inline-block text-primary hover:underline" href={`/admin/crawler/agencies/${agencyId}/discoveries`}>
            Criar Discovery
          </Link>
        </div>
      </div>
    );
  }

  if (activeContracts.length === 0) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
        <TriangleAlert className="size-4 shrink-0 text-warning" />
        <div className="space-y-1">
          <p className="text-foreground">Ative um Contrato de Dados de Mercado antes de gerar um perfil.</p>
          <Link className="inline-block text-primary hover:underline" href="/admin/crawler/settings">
            Administrar contratos
          </Link>
        </div>
      </div>
    );
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

  const suggesting = suggestionOperation !== null && isActiveCrawlerOperation(suggestionOperation);
  const invalidUrl = sampleUrl !== "" && !isValidUrl;

  return (
    <div className="space-y-5" id="profile-generation">
      <div className="grid gap-5 md:grid-cols-2">
        <FormField htmlFor={`profile-snapshot-${agencyId}`} label="Snapshot de Discovery">
          <NativeSelect
            aria-describedby={`profile-snapshot-help-${agencyId}`}
            id={`profile-snapshot-${agencyId}`}
            onChange={(event) => setSnapshotId(event.target.value)}
            value={snapshotId}
          >
            <option value="">Selecione um Discovery</option>
            {snapshots.map((snapshot) => (
              <option key={snapshot.id} value={snapshot.id}>#{snapshot.id} · {snapshot.url_count} URLs</option>
            ))}
          </NativeSelect>
          <p className="text-xs text-muted-foreground" id={`profile-snapshot-help-${agencyId}`}>
            Conjunto imutável de URLs usado para gerar e reproduzir esta versão.
          </p>
        </FormField>
        <FormField htmlFor={`profile-contract-${agencyId}`} label="Contrato de Dados de Mercado">
          <NativeSelect
            aria-describedby={`profile-contract-help-${agencyId}`}
            id={`profile-contract-${agencyId}`}
            onChange={(event) => setContractId(event.target.value)}
            value={contractId}
          >
            <option value="">Selecione o contrato</option>
            {activeContracts.map((contract) => (
              <option key={contract.id} value={contract.id}>Versão {contract.version}</option>
            ))}
          </NativeSelect>
          <p className="text-xs text-muted-foreground" id={`profile-contract-help-${agencyId}`}>
            Define os campos canônicos que o perfil deve extrair e normalizar.
          </p>
        </FormField>
      </div>
      {prototypeVariant ? (
        <>
          <SampleUrlPickerPrototype
            agencyId={agencyId}
            disabled={suggesting}
            onChange={(url) => {
              setSampleUrl(url);
              setConfirmed(false);
            }}
            onSuggest={() => void suggest()}
            sampleUrl={sampleUrl}
            snapshotId={snapshotId}
            suggesting={suggesting}
            variant={prototypeVariant}
          />
          {invalidUrl && <p className="text-xs text-destructive">Informe uma URL http ou https válida.</p>}
        </>
      ) : (
        <FormField htmlFor={`profile-sample-url-${agencyId}`} label="URL de amostra">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              aria-describedby={`profile-sample-url-help-${agencyId}`}
              aria-invalid={invalidUrl}
              id={`profile-sample-url-${agencyId}`}
              onChange={(event) => {
                setSampleUrl(event.target.value);
                setConfirmed(false);
              }}
              type="url"
              value={sampleUrl}
            />
            <Button disabled={suggesting} onClick={() => void suggest()} type="button" variant="outline">
              {suggesting ? "Buscando…" : "Sugerir pela home"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground" id={`profile-sample-url-help-${agencyId}`}>
            Página de imóvel usada como referência pela geração dos seletores.
          </p>
          {invalidUrl && <p className="text-xs text-destructive">Informe uma URL http ou https válida.</p>}
        </FormField>
      )}
      <div className="flex items-center gap-2">
        <Checkbox
          aria-label="Confirmo a URL"
          checked={confirmed}
          id={`confirm-sample-url-${agencyId}`}
          onCheckedChange={(checked) => setConfirmed(checked === true)}
        />
        <Label htmlFor={`confirm-sample-url-${agencyId}`}>Confirmo a URL de amostra</Label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          data-primary-action={primaryAction ? "true" : undefined}
          disabled={disabledReason !== null}
          onClick={() => void generate()}
          type="button"
          variant={primaryAction ? "default" : "outline"}
        >
          Gerar Perfil Candidato
        </Button>
        {disabledReason && !invalidUrl && <p className="text-sm text-muted-foreground">{disabledReason}</p>}
      </div>
      {suggestionOperation && <CrawlerOperationStatus agencyId={agencyId} operation={suggestionOperation} />}
      {generationOperation && <CrawlerOperationStatus agencyId={agencyId} operation={generationOperation} />}
    </div>
  );
}
