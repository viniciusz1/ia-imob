"use client";

import { CircleCheck, CircleX, Search, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { getProfileValidationRecords } from "@/services/crawlerService";
import type { PaginatedProfileValidationRecords, ProfileValidationRecord } from "@/types/crawler";

const fieldLabels: Record<string, string> = {
  bairro: "Bairro",
  cidade: "Cidade",
  imagem: "Imagem",
  tipo_imovel: "Tipo de imóvel",
  title: "Título",
  url: "URL",
  valor: "Valor",
};

function valueLabel(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value, null, 2);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function recordWarnings(record: ProfileValidationRecord): string[] {
  const quality = record.normalized_data?._quality;
  if (!isRecord(quality) || !Array.isArray(quality.warnings)) return [];
  return quality.warnings.filter((warning): warning is string => typeof warning === "string");
}

function EvidenceData({ data, emptyLabel }: { data: Record<string, unknown> | null; emptyLabel: string }) {
  if (data === null || Object.keys(data).length === 0) return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;

  return (
    <dl className="divide-y rounded-lg border">
      {Object.entries(data).map(([field, value]) => (
        <div className="grid gap-1 px-4 py-3 lg:grid-cols-[10rem_1fr]" key={field}>
          <dt className="text-xs text-muted-foreground">{fieldLabels[field] ?? field}</dt>
          <dd className="whitespace-pre-wrap break-words text-sm text-foreground">{valueLabel(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ProfileEvidenceInspector({ agencyId, profileId, reportId, totalRecords }: { agencyId: number; profileId: number; reportId: number; totalRecords: number }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "issues">("all");
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PaginatedProfileValidationRecords | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);

  const beginLoad = () => {
    setLoading(true);
    setError(null);
    setRequestVersion((current) => current + 1);
  };

  useEffect(() => {
    if (!open) return;
    let active = true;
    void getProfileValidationRecords(agencyId, profileId, reportId, { filter, search, page, per_page: 5 })
      .then((records) => {
        if (!active) return;
        setResult(records);
        setSelectedId((current) => records.data.some((record) => record.id === current) ? current : (records.data[0]?.id ?? null));
      })
      .catch(() => {
        if (active) setError("Não foi possível carregar as evidências desta validação.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [agencyId, filter, open, page, profileId, reportId, requestVersion, search]);

  const selected: ProfileValidationRecord | undefined = result?.data.find((record) => record.id === selectedId);
  const selectedIndex = result?.data.findIndex((record) => record.id === selectedId) ?? -1;
  const selectedWarnings = selected ? recordWarnings(selected) : [];

  if (!open) {
    return (
      <Button
        onClick={() => {
          beginLoad();
          setOpen(true);
        }}
        type="button"
        variant="outline"
      >
        <Search />
        Inspecionar evidências ({totalRecords})
      </Button>
    );
  }

  return (
    <section aria-label="Evidências da validação" className="space-y-4 rounded-lg border p-4">
      <div className="flex flex-wrap items-end gap-3">
        <form
          className="min-w-72 flex-1"
          onSubmit={(event) => {
            event.preventDefault();
            beginLoad();
            setPage(1);
            setSearch(searchDraft.trim());
          }}
        >
          <FormField htmlFor={`evidence-search-${reportId}`} label="Localizar URL">
            <div className="flex gap-2">
              <Input
                size="sm"
                id={`evidence-search-${reportId}`}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Parte da URL"
                value={searchDraft}
              />
              <Button size="sm" type="submit" variant="outline">Buscar</Button>
            </div>
          </FormField>
        </form>
        <div className="flex h-9 items-center gap-2">
          <Checkbox
            aria-label="Somente URLs com problemas"
            checked={filter === "issues"}
            id={`evidence-issues-${reportId}`}
            onCheckedChange={(checked) => {
              beginLoad();
              setFilter(checked === true ? "issues" : "all");
              setPage(1);
            }}
          />
          <Label htmlFor={`evidence-issues-${reportId}`}>Somente URLs com problemas</Label>
        </div>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Carregando evidências…</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!loading && !error && result?.data.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhuma evidência corresponde aos filtros.</p>
      )}

      {result && result.data.length > 0 && (
        <div className="grid gap-4 xl:grid-cols-[22rem_1fr]">
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground tabular-nums">{result.meta.total} URL(s) encontrada(s)</p>
            <ol className="space-y-1">
              {result.data.map((record) => {
                const isSelected = record.id === selectedId;
                const warnings = recordWarnings(record).length;
                return (
                  <li
                    className={cn("rounded-lg px-3 py-2 transition-colors", isSelected ? "bg-primary/10" : "hover:bg-muted")}
                    key={record.id}
                  >
                    <button
                      aria-current={isSelected ? "true" : undefined}
                      className={cn(
                        "flex w-full cursor-pointer items-center gap-2 rounded-md text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                        isSelected ? "text-primary" : "text-foreground",
                      )}
                      onClick={() => setSelectedId(record.id)}
                      type="button"
                    >
                      {record.is_valid
                        ? <CircleCheck className={cn("size-3.5 shrink-0", warnings > 0 ? "text-warning" : "text-success")} />
                        : <CircleX className="size-3.5 shrink-0 text-destructive" />}
                      <span>
                        {record.is_valid
                          ? (warnings > 0 ? `Válido com ${warnings} aviso(s)` : "Registro válido")
                          : `Falha crítica · ${record.errors.length} erro(s)${warnings > 0 ? ` · ${warnings} aviso(s)` : ""}`}
                      </span>
                    </button>
                    <a
                      className="mt-0.5 block break-all text-xs text-muted-foreground hover:text-primary hover:underline"
                      href={record.url}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {record.url}
                    </a>
                  </li>
                );
              })}
            </ol>
            <div className="flex items-center justify-between gap-2">
              <Button
                disabled={result.meta.current_page <= 1}
                onClick={() => {
                  beginLoad();
                  setPage((current) => current - 1);
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                Anterior
              </Button>
              <span className="text-xs text-muted-foreground tabular-nums">
                Página {result.meta.current_page} de {result.meta.last_page}
              </span>
              <Button
                disabled={result.meta.current_page >= result.meta.last_page}
                onClick={() => {
                  beginLoad();
                  setPage((current) => current + 1);
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                Próxima
              </Button>
            </div>
          </div>

          {selected && (
            <article aria-label={`Evidência ${selected.url}`} className="space-y-4">
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">URL selecionada</p>
                <a
                  className="break-all text-sm text-primary hover:underline"
                  href={selected.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  {selected.url}
                </a>
              </div>
              {selected.errors.length > 0 && (
                <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
                  <CircleX className="size-4 shrink-0 text-destructive" />
                  <div>
                    <h5 className="text-destructive">Erros</h5>
                    <ul className="mt-1 list-disc pl-5 text-foreground">
                      {selected.errors.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </div>
                </div>
              )}
              {selectedWarnings.length > 0 && (
                <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
                  <TriangleAlert className="size-4 shrink-0 text-warning" />
                  <div>
                    <h5 className="text-warning">Avisos</h5>
                    <ul className="mt-1 list-disc pl-5 text-foreground">
                      {selectedWarnings.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </div>
                </div>
              )}
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <h5 className="text-xs uppercase tracking-wide text-muted-foreground">Dado bruto</h5>
                  <EvidenceData data={selected.raw_data} emptyLabel="Nenhum dado bruto disponível." />
                </div>
                <div className="space-y-2">
                  <h5 className="text-xs uppercase tracking-wide text-muted-foreground">Dado normalizado</h5>
                  <EvidenceData data={selected.normalized_data} emptyLabel="Nenhum dado normalizado disponível." />
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <Button
                  disabled={selectedIndex <= 0}
                  onClick={() => setSelectedId(result.data[selectedIndex - 1]?.id ?? null)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  URL anterior
                </Button>
                <span className="text-xs text-muted-foreground tabular-nums">
                  Registro {selectedIndex + 1} de {result.data.length} nesta página
                </span>
                <Button
                  disabled={selectedIndex < 0 || selectedIndex >= result.data.length - 1}
                  onClick={() => setSelectedId(result.data[selectedIndex + 1]?.id ?? null)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Próxima URL
                </Button>
              </div>
              <details className="rounded-lg border p-4">
                <summary className="cursor-pointer text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
                  Ver payload técnico integral
                </summary>
                <pre className="mt-3 max-h-96 overflow-auto rounded-lg bg-muted p-3 font-mono text-xs">
                  {JSON.stringify({
                    raw_data: selected.raw_data,
                    normalized_data: selected.normalized_data,
                    errors: selected.errors,
                    field_presence: selected.field_presence,
                  }, null, 2)}
                </pre>
              </details>
            </article>
          )}
        </div>
      )}

      <Button onClick={() => setOpen(false)} size="sm" type="button" variant="ghost">Fechar evidências</Button>
    </section>
  );
}
