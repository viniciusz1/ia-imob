"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getCrawlerOperation,
  queueExtractionProfileGeneration,
  queueSampleUrlSuggestion,
} from "@/services/crawlerService";
import type { DiscoverySnapshot, MarketDataContract } from "@/types/crawler";

interface ExtractionProfileGeneratorProps {
  agencyId: number;
  snapshots: DiscoverySnapshot[];
  contracts: MarketDataContract[];
  initialSampleUrl?: string;
}

export function ExtractionProfileGenerator({ agencyId, snapshots, contracts, initialSampleUrl = "" }: ExtractionProfileGeneratorProps) {
  const activeContracts = contracts.filter((contract) => contract.status === "active");
  const [snapshotId, setSnapshotId] = useState(snapshots[0]?.id.toString() ?? "");
  const [contractId, setContractId] = useState(activeContracts[0]?.id.toString() ?? "");
  const [sampleUrl, setSampleUrl] = useState(initialSampleUrl);
  const [confirmed, setConfirmed] = useState(false);
  const [suggestionOperationId, setSuggestionOperationId] = useState<number | null>(null);

  useEffect(() => {
    if (suggestionOperationId === null) return;
    const interval = window.setInterval(() => {
      void getCrawlerOperation(suggestionOperationId).then((operation) => {
        if (operation.state === "succeeded") {
          const suggestion = operation.result?.sample_url;
          setSampleUrl(typeof suggestion === "string" ? suggestion : "");
          setSuggestionOperationId(null);
        } else if (["failed", "cancelled"].includes(operation.state)) {
          setSuggestionOperationId(null);
        }
      });
    }, 3000);
    return () => window.clearInterval(interval);
  }, [suggestionOperationId]);

  const suggest = async () => {
    const operation = await queueSampleUrlSuggestion(agencyId);
    setSuggestionOperationId(operation.id);
    setConfirmed(false);
  };

  const generate = async () => {
    if (!confirmed || !sampleUrl || !snapshotId || !contractId) return;
    await queueExtractionProfileGeneration({
      crawl_agency_id: agencyId,
      discovery_snapshot_id: Number(snapshotId),
      market_data_contract_version_id: Number(contractId),
      sample_url: sampleUrl,
      sample_url_confirmed: true,
    });
    toast.success("Geração do Perfil de Extração enfileirada.");
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <select aria-label="Snapshot de Discovery" className="rounded-md border bg-transparent px-3 py-2" value={snapshotId} onChange={(event) => setSnapshotId(event.target.value)}>
          <option value="">Selecione um discovery</option>
          {snapshots.map((snapshot) => <option key={snapshot.id} value={snapshot.id}>#{snapshot.id} · {snapshot.url_count} URLs</option>)}
        </select>
        <select aria-label="Contrato de Dados de Mercado" className="rounded-md border bg-transparent px-3 py-2" value={contractId} onChange={(event) => setContractId(event.target.value)}>
          <option value="">Selecione o contrato</option>
          {activeContracts.map((contract) => <option key={contract.id} value={contract.id}>Versão {contract.version}</option>)}
        </select>
      </div>
      <div className="flex gap-2"><Input aria-label="URL de amostra" type="url" value={sampleUrl} onChange={(event) => { setSampleUrl(event.target.value); setConfirmed(false); }} /><Button type="button" variant="outline" onClick={suggest} disabled={suggestionOperationId !== null}>{suggestionOperationId ? "Buscando…" : "Sugerir pela home"}</Button></div>
      <div className="flex items-center gap-2"><Checkbox aria-label="Confirmo a URL" id="confirm-sample-url" checked={confirmed} onCheckedChange={(checked) => setConfirmed(checked === true)} /><Label htmlFor="confirm-sample-url">Confirmo a URL de amostra</Label></div>
      <Button type="button" onClick={generate} disabled={!confirmed || !sampleUrl || !snapshotId || !contractId}>Gerar Perfil Candidato</Button>
    </div>
  );
}
