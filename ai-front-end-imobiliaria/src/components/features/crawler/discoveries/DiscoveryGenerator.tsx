"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { queueDiscoveryOperation } from "@/services/crawlerService";
import type { MarketDataContract } from "@/types/crawler";
import { crawlerOperationErrorMessage } from "../crawlerOperationFeedback";

interface DiscoveryGeneratorProps {
  agencyId: number;
  contracts: MarketDataContract[];
}

export function DiscoveryGenerator({ agencyId, contracts }: DiscoveryGeneratorProps) {
  const activeContracts = contracts.filter((contract) => contract.status === "active");
  const [contractId, setContractId] = useState(activeContracts[0]?.id.toString() ?? "");
  const [isQueueing, setIsQueueing] = useState(false);

  const queueDiscovery = async () => {
    if (!contractId) return;

    setIsQueueing(true);
    try {
      const operation = await queueDiscoveryOperation(agencyId, Number(contractId));
      toast.success(`Discovery enfileirado como operação #${operation.id}.`);
    } catch (error) {
      toast.error(crawlerOperationErrorMessage(error, "Não foi possível enfileirar o Discovery."));
    } finally {
      setIsQueueing(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-3">
      <select aria-label="Contrato de dados" className="rounded-md border bg-transparent px-3" onChange={(event) => setContractId(event.target.value)} value={contractId}>
        <option value="">Selecione o contrato ativo</option>
        {activeContracts.map((contract) => <option key={contract.id} value={contract.id}>Versão {contract.version}</option>)}
      </select>
      <Button className="cursor-pointer disabled:cursor-not-allowed" disabled={!contractId || isQueueing} onClick={() => void queueDiscovery()} type="button">{isQueueing ? "Enfileirando Discovery…" : "Enfileirar Discovery"}</Button>
    </div>
  );
}
