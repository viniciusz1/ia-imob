"use client";

import { ChevronDown, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
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

  const allSourcesSelected = sources.length === DISCOVERY_SOURCES.length;

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm text-foreground">Fontes do Discovery</h3>
            <p className="text-xs text-muted-foreground">
              Combine fontes para aumentar a cobertura das URLs encontradas.
            </p>
          </div>
          <Button
            onClick={() => setSources(allSourcesSelected ? [] : DISCOVERY_SOURCES.map(({ value }) => value))}
            size="sm"
            type="button"
            variant="outline"
          >
            {allSourcesSelected ? "Limpar seleção" : "Todas as fontes nativas"}
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {DISCOVERY_SOURCES.map((source) => {
            const checked = sources.includes(source.value);
            return (
              <label
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border p-4 text-sm transition-colors",
                  checked ? "border-primary/20 bg-primary/5" : "hover:bg-muted/40",
                )}
                key={source.value}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(nextChecked) => setSources((current) => nextChecked
                    ? [...current, source.value]
                    : current.filter((item) => item !== source.value))}
                />
                <span className="text-foreground">{source.label}</span>
              </label>
            );
          })}
        </div>
      </section>

      <details className="group rounded-lg border">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="min-w-0">
            <span className="block text-sm text-foreground">Opções avançadas</span>
            <span className="block text-xs text-muted-foreground">
              Controle alcance, volume e renderização da descoberta.
            </span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          />
        </summary>
        <div className="grid gap-4 border-t p-4 md:grid-cols-2">
          <FormField hint="Máximo de URLs mantidas neste Snapshot." htmlFor="discovery-max-urls" label="Limite de URLs">
            <Input
              id="discovery-max-urls"
              max="10000"
              min="1"
              onChange={(event) => setMaxUrls(event.target.value)}
              type="number"
              value={maxUrls}
            />
          </FormField>
          <FormField
            hint="Ajuda o DomainMapper a priorizar URLs relacionadas."
            htmlFor="discovery-query"
            label="Consulta de relevância"
          >
            <Input
              id="discovery-query"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ex.: apartamentos em Suzano"
              value={query}
            />
          </FormField>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/40">
            <Checkbox checked={includeSubdomains} onCheckedChange={(checked) => setIncludeSubdomains(checked === true)} />
            <span className="grid gap-1">
              <span className="text-sm text-foreground">Incluir subdomínios</span>
              <span className="text-xs text-muted-foreground">Procura URLs além do domínio principal.</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/40">
            <Checkbox checked={useBrowserForHomepage} onCheckedChange={(checked) => setUseBrowserForHomepage(checked === true)} />
            <span className="grid gap-1">
              <span className="text-sm text-foreground">Usar browser na página inicial</span>
              <span className="text-xs text-muted-foreground">Renderiza JavaScript antes de extrair links da home.</span>
            </span>
          </label>
        </div>
      </details>

      <div className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-end sm:justify-between">
        <FormField className="w-full sm:w-72" htmlFor="discovery-contract" label="Contrato de dados">
          <NativeSelect
            id="discovery-contract"
            onChange={(event) => setContractId(event.target.value)}
            value={contractId}
          >
            <option value="">Selecione o contrato ativo</option>
            {activeContracts.map((contract) => (
              <option key={contract.id} value={contract.id}>Versão {contract.version}</option>
            ))}
          </NativeSelect>
        </FormField>
        <Button
          disabled={!contractId || sources.length === 0 || Number(maxUrls) < 1 || isQueueing}
          onClick={() => void queueDiscovery()}
          type="button"
        >
          {isQueueing && <LoaderCircle className="animate-spin" />}
          {isQueueing ? "Enfileirando Discovery…" : "Enfileirar Discovery"}
        </Button>
      </div>
    </div>
  );
}
