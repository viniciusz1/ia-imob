"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { queueProductionCrawl } from "@/services/crawlerService";
import { crawlerOperationErrorMessage } from "../crawlerOperationFeedback";

interface ProductionCrawlPanelProps {
  agencyId: number;
  snapshots: Array<{ id: number; url_count: number; created_at: string }>;
  profiles: Array<{ id: number; version: number; status: string; sample_url: string }>;
}

export function ProductionCrawlPanel({ agencyId, snapshots, profiles }: ProductionCrawlPanelProps) {
  const usableProfiles = profiles.filter((profile) => ["active", "approved"].includes(profile.status));
  const activeProfile = usableProfiles.find((profile) => profile.status === "active") ?? usableProfiles[0];
  const [discovery, setDiscovery] = useState("fresh");
  const [profileId, setProfileId] = useState(activeProfile?.id.toString() ?? "");
  const [operationId, setOperationId] = useState<number | null>(null);

  const queue = async () => {
    if (!profileId) return;
    try {
      const operation = await queueProductionCrawl({
        crawl_agency_id: agencyId,
        discovery_mode: discovery === "fresh" ? "fresh" : "existing",
        ...(discovery === "fresh" ? {} : { discovery_snapshot_id: Number(discovery) }),
        extraction_profile_id: Number(profileId),
      });
      setOperationId(operation.id);
      toast.success(`Crawl enfileirado como operação #${operation.id}.`);
    } catch (error) {
      toast.error(crawlerOperationErrorMessage(error, "Não foi possível enfileirar o crawl."));
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <select aria-label="Discovery do crawl" className="rounded-md border bg-transparent px-3 py-2" onChange={(event) => setDiscovery(event.target.value)} value={discovery}>
          <option value="fresh">Gerar novo Discovery</option>
          {snapshots.map((snapshot) => <option key={snapshot.id} value={snapshot.id}>Usar Snapshot #{snapshot.id} · {snapshot.url_count} URLs</option>)}
        </select>
        <select aria-label="Perfil de Extração" className="rounded-md border bg-transparent px-3 py-2" onChange={(event) => setProfileId(event.target.value)} value={profileId}>
          <option value="">Selecione o Perfil de Extração</option>
          {usableProfiles.map((profile) => <option key={profile.id} value={profile.id}>v{profile.version} · {profile.status}</option>)}
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button className="cursor-pointer disabled:cursor-not-allowed" disabled={!profileId || operationId !== null} onClick={() => void queue()} type="button">{operationId ? `Crawl #${operationId} enfileirado` : "Rodar Crawl"}</Button>
        <Link className="cursor-pointer text-sm underline" href={`/admin/crawler/agencies/${agencyId}/discoveries`}>Gerar novo Discovery ou Perfil</Link>
      </div>
    </div>
  );
}
