"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { usePermission } from "@/hooks/usePermission";
import { activateCrawlAgencyDiscoveryPolicy, queueProductionCrawl } from "@/services/crawlerService";
import type { CrawlAgency, DiscoveryPolicyVersion } from "@/types/crawler";
import { crawlerOperationErrorMessage } from "../crawlerOperationFeedback";

interface ProductionCrawlPanelProps {
  agency: CrawlAgency;
  discoveryPolicies: DiscoveryPolicyVersion[];
  snapshots: Array<{ id: number; url_count: number; created_at: string }>;
  profiles: Array<{ id: number; version: number; status: string; sample_url: string }>;
}

export function ProductionCrawlPanel({ agency: initialAgency, discoveryPolicies: initialPolicies, snapshots, profiles }: ProductionCrawlPanelProps) {
  const [agency, setAgency] = useState(initialAgency);
  const [discoveryPolicies, setDiscoveryPolicies] = useState(initialPolicies.filter((policy) => policy.status === "available"));
  const usableProfiles = profiles.filter((profile) => ["active", "approved"].includes(profile.status));
  const activeProfile = usableProfiles.find((profile) => profile.status === "active") ?? usableProfiles[0];
  const [discovery, setDiscovery] = useState("fresh");
  const [policyId, setPolicyId] = useState(agency.active_discovery_policy_version_id?.toString() ?? "");
  const [profileId, setProfileId] = useState(activeProfile?.id.toString() ?? "");
  const [onlyNewUrls, setOnlyNewUrls] = useState(false);
  const [operationId, setOperationId] = useState<number | null>(null);
  const [confirmActivation, setConfirmActivation] = useState(false);
  const [activating, setActivating] = useState(false);
  const canExecute = usePermission("crawler.operations.execute");
  const canManagePolicies = usePermission("crawler.policies.manage");
  const activePolicyId = agency.active_discovery_policy_version_id ?? null;
  const selectedPolicy = discoveryPolicies.find((policy) => policy.id === Number(policyId));
  const isOverride = discovery === "fresh"
    && selectedPolicy !== undefined
    && selectedPolicy.id !== activePolicyId;

  const queue = async () => {
    if (!profileId || !policyId) return;
    try {
      const operation = await queueProductionCrawl({
        crawl_agency_id: agency.id,
        discovery_mode: discovery === "fresh" ? "fresh" : "existing",
        ...(discovery === "fresh" ? {} : { discovery_snapshot_id: Number(discovery) }),
        ...(discovery !== "fresh" && onlyNewUrls ? { only_new_urls: true } : {}),
        ...(isOverride ? { discovery_policy_version_id: Number(policyId) } : {}),
        extraction_profile_id: Number(profileId),
      });
      setOperationId(operation.id);
      toast.success(`Crawl enfileirado como operação #${operation.id}.`);
    } catch (error) {
      toast.error(crawlerOperationErrorMessage(error, "Não foi possível enfileirar o crawl."));
    }
  };

  const activateOverride = async () => {
    if (!selectedPolicy || !confirmActivation) return;
    setActivating(true);
    try {
      const updated = await activateCrawlAgencyDiscoveryPolicy(agency.id, selectedPolicy.id);
      setAgency(updated);
      if (updated.active_discovery_policy) {
        const activated = updated.active_discovery_policy;
        const catalogPolicy: DiscoveryPolicyVersion = {
          id: activated.id ?? 0,
          policy_key: selectedPolicy.policy_key,
          name: activated.name,
          version: activated.version ?? selectedPolicy.version + 1,
          status: "available",
          strategies: activated.strategies,
          configuration: activated.configuration,
          mutable: false,
          model_reference_count: 0,
          active_model_reference_count: 0,
          created_by: selectedPolicy.created_by,
          created_at: new Date().toISOString(),
        };
        setDiscoveryPolicies((current) => [...current, catalogPolicy]);
        setPolicyId(String(catalogPolicy.id));
      }
      setConfirmActivation(false);
      toast.success("Nova versão criada e definida como Política de Discovery Ativa.");
    } catch (error: unknown) {
      toast.error(crawlerOperationErrorMessage(error, "Não foi possível ativar a nova versão da política."));
    } finally {
      setActivating(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-lg border bg-muted/20 p-4">
        <p className="text-sm text-muted-foreground">Política de Discovery Ativa</p>
        {agency.active_discovery_policy ? (
          <>
            <p className="font-medium">{agency.active_discovery_policy.name} · v{agency.active_discovery_policy.version}</p>
            <p className="mt-1 text-sm text-muted-foreground">{agency.active_discovery_policy.strategies.join(" → ")}</p>
          </>
        ) : <p className="font-medium text-destructive">Nenhuma política ativa. Crawls com discovery novo estão bloqueados.</p>}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <select aria-label="Discovery do crawl" className="rounded-md border bg-transparent px-3 py-2" disabled={!canExecute || operationId !== null} onChange={(event) => { setDiscovery(event.target.value); if (event.target.value === "fresh") setOnlyNewUrls(false); }} value={discovery}>
          <option value="fresh">Gerar novo Discovery</option>
          {snapshots.map((snapshot) => <option key={snapshot.id} value={snapshot.id}>Usar Snapshot #{snapshot.id} · {snapshot.url_count} URLs</option>)}
        </select>
        <select aria-label="Perfil de Extração" className="rounded-md border bg-transparent px-3 py-2" disabled={!canExecute || operationId !== null} onChange={(event) => setProfileId(event.target.value)} value={profileId}>
          <option value="">Selecione o Perfil de Extração</option>
          {usableProfiles.map((profile) => <option key={profile.id} value={profile.id}>v{profile.version} · {profile.status}</option>)}
        </select>
      </div>
      {discovery !== "fresh" && (
        <div className="flex items-start gap-2 rounded-lg border bg-muted/20 p-4">
          <Checkbox checked={onlyNewUrls} disabled={!canExecute || operationId !== null} id="manual-crawl-only-new-urls" onCheckedChange={(checked) => setOnlyNewUrls(checked === true)} />
          <div className="space-y-1">
            <Label className="font-normal" htmlFor="manual-crawl-only-new-urls">Somente URLs ainda não importadas</Label>
            <p className="text-xs text-muted-foreground">Compara o snapshot com o histórico desta Crawl Agency antes de criar a operação.</p>
          </div>
        </div>
      )}
      {discovery === "fresh" && (
        <div className="space-y-2">
          <Label htmlFor="manual-crawl-discovery-policy">Política para esta operação</Label>
          <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" disabled={!canExecute || operationId !== null} id="manual-crawl-discovery-policy" onChange={(event) => { setPolicyId(event.target.value); setConfirmActivation(false); }} value={policyId}>
            <option value="">Selecione uma política</option>
            {discoveryPolicies.map((policy) => <option key={policy.id} value={policy.id}>{policy.name} · v{policy.version}{policy.id === activePolicyId ? " · ativa" : ""}</option>)}
          </select>
          {isOverride && <p className="text-sm text-amber-700">Override pontual: vale somente para esta Operação do Crawler e não altera o agendamento.</p>}
        </div>
      )}
      {isOverride && canManagePolicies && (
        <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <p className="font-medium">Salvar override como nova política ativa</p>
          <p className="text-sm text-muted-foreground">A ação criará uma nova versão de “{selectedPolicy.name}” antes de alterar o padrão da Crawl Agency.</p>
          <div className="flex items-start gap-2">
            <Checkbox checked={confirmActivation} disabled={activating} id="confirm-active-discovery-policy" onCheckedChange={(checked) => setConfirmActivation(checked === true)} />
            <Label className="font-normal" htmlFor="confirm-active-discovery-policy">Confirmo a criação e ativação de uma nova versão. A operação já enfileirada, se houver, continuará imutável.</Label>
          </div>
          <Button disabled={!confirmActivation || activating} onClick={() => void activateOverride()} type="button" variant="outline">{activating ? "Ativando…" : "Salvar como nova política ativa"}</Button>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        {canExecute && <Button className="cursor-pointer disabled:cursor-not-allowed" disabled={!profileId || !policyId || operationId !== null} onClick={() => void queue()} type="button">{operationId ? `Crawl #${operationId} enfileirado` : "Rodar Crawl"}</Button>}
        <Link className="cursor-pointer text-sm underline" href={`/admin/crawler/agencies/${agency.id}/discoveries`}>Gerar novo Discovery ou Perfil</Link>
      </div>
    </div>
  );
}
