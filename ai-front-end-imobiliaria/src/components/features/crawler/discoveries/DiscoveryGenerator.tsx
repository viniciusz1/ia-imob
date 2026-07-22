"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { queueDiscoveryOperation } from "@/services/crawlerService";
import type { DiscoverySource } from "@/services/crawlerService";
import type { MarketDataContract } from "@/types/crawler";
import { crawlerOperationErrorMessage } from "../crawlerOperationFeedback";

interface DiscoveryGeneratorProps {
  agencyId: number;
  contracts: MarketDataContract[];
}

const DISCOVERY_SOURCES = [
  { value: "sitemap", label: "Sitemap XML" },
  { value: "cc", label: "Common Crawl" },
  { value: "wayback", label: "Wayback Machine" },
  { value: "crt", label: "Certificados CT" },
  { value: "probe", label: "Rotas comuns" },
  { value: "robots", label: "robots.txt" },
  { value: "feed", label: "Feeds RSS/Atom" },
  { value: "homepage", label: "Página inicial" },
] as const;

const DEFAULT_SOURCES: DiscoverySource[] = ["sitemap", "cc", "crt", "probe"];

export function DiscoveryGenerator({ agencyId, contracts }: DiscoveryGeneratorProps) {
  const activeContracts = contracts.filter((contract) => contract.status === "active");
  const [contractId, setContractId] = useState(activeContracts[0]?.id.toString() ?? "");
  const [isQueueing, setIsQueueing] = useState(false);
  const [sources, setSources] = useState<DiscoverySource[]>(DEFAULT_SOURCES);
  const [maxUrls, setMaxUrls] = useState("500");
  const [includeSubdomains, setIncludeSubdomains] = useState(true);
  const [useBrowserForHomepage, setUseBrowserForHomepage] = useState(false);
  const [query, setQuery] = useState("");

  const queueDiscovery = async () => {
    if (!contractId) return;

    setIsQueueing(true);
    try {
      const operation = await queueDiscoveryOperation(agencyId, Number(contractId), {
        sources,
        max_urls: Number(maxUrls),
        include_subdomains: includeSubdomains,
        use_browser_for_homepage: useBrowserForHomepage,
        ...(query.trim() ? { query: query.trim() } : {}),
      });
      toast.success(`Discovery enfileirado como operação #${operation.id}.`);
    } catch (error) {
      toast.error(crawlerOperationErrorMessage(error, "Não foi possível enfileirar o Discovery."));
    } finally {
      setIsQueueing(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-lg border bg-muted/20 p-4">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-medium">Fontes do Discovery</h3>
            <p className="text-sm text-muted-foreground">Combine fontes para aumentar a cobertura das URLs encontradas.</p>
          </div>
          <Button
            className="cursor-pointer"
            onClick={() => setSources(sources.length === DISCOVERY_SOURCES.length ? [] : DISCOVERY_SOURCES.map(({ value }) => value))}
            size="sm"
            type="button"
            variant="outline"
          >
            {sources.length === DISCOVERY_SOURCES.length ? "Limpar seleção" : "Todas as fontes nativas"}
          </Button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {DISCOVERY_SOURCES.map((source) => {
            const checked = sources.includes(source.value);
            return (
              <label className="flex cursor-pointer items-center gap-3 rounded-md border bg-background px-3 py-3 text-sm transition-colors hover:bg-accent" key={source.value}>
                <Checkbox
                  checked={checked}
                  onCheckedChange={(nextChecked) => setSources((current) => nextChecked
                    ? [...current, source.value]
                    : current.filter((item) => item !== source.value))}
                />
                <span>{source.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      <details className="group rounded-lg border bg-background">
        <summary className="cursor-pointer list-none px-4 py-3 font-medium marker:content-none">
          <div className="flex items-center justify-between gap-3">
            <div>
              <span>Opções avançadas</span>
              <p className="mt-0.5 text-sm font-normal text-muted-foreground">Controle alcance, volume e renderização da descoberta.</p>
            </div>
            <span aria-hidden="true" className="text-muted-foreground transition-transform group-open:rotate-180">⌄</span>
          </div>
        </summary>
        <div className="grid gap-4 border-t bg-muted/10 p-4 md:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium">
            Limite de URLs
            <Input min="1" max="10000" onChange={(event) => setMaxUrls(event.target.value)} type="number" value={maxUrls} />
            <span className="text-xs font-normal text-muted-foreground">Máximo de URLs mantidas neste Snapshot.</span>
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Consulta de relevância
            <Input onChange={(event) => setQuery(event.target.value)} placeholder="Ex.: apartamentos em Suzano" value={query} />
            <span className="text-xs font-normal text-muted-foreground">Ajuda o DomainMapper a priorizar URLs relacionadas.</span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-md border bg-background p-3">
            <Checkbox checked={includeSubdomains} onCheckedChange={(checked) => setIncludeSubdomains(checked === true)} />
            <span className="grid gap-1 text-sm font-medium">
              Incluir subdomínios
              <span className="text-xs font-normal text-muted-foreground">Procura URLs além do domínio principal.</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-md border bg-background p-3">
            <Checkbox checked={useBrowserForHomepage} onCheckedChange={(checked) => setUseBrowserForHomepage(checked === true)} />
            <span className="grid gap-1 text-sm font-medium">
              Usar browser na página inicial
              <span className="text-xs font-normal text-muted-foreground">Renderiza JavaScript antes de extrair links da home.</span>
            </span>
          </label>
        </div>
      </details>

      <div className="flex flex-wrap items-end gap-3 border-t pt-4">
        <label className="grid gap-1.5 text-sm font-medium">
          Contrato de dados
          <select aria-label="Contrato de dados" className="h-9 min-w-60 rounded-md border bg-transparent px-3 font-normal" onChange={(event) => setContractId(event.target.value)} value={contractId}>
            <option value="">Selecione o contrato ativo</option>
            {activeContracts.map((contract) => <option key={contract.id} value={contract.id}>Versão {contract.version}</option>)}
          </select>
        </label>
        <Button className="cursor-pointer disabled:cursor-not-allowed" disabled={!contractId || sources.length === 0 || Number(maxUrls) < 1 || isQueueing} onClick={() => void queueDiscovery()} type="button">{isQueueing ? "Enfileirando Discovery…" : "Enfileirar Discovery"}</Button>
      </div>
    </div>
  );
}
