"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <dl className="divide-y rounded-md border">
      {Object.entries(data).map(([field, value]) => (
        <div className="grid gap-1 p-3 lg:grid-cols-[10rem_1fr]" key={field}>
          <dt className="font-medium">{fieldLabels[field] ?? field}</dt>
          <dd className="whitespace-pre-wrap break-words text-sm">{valueLabel(value)}</dd>
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
    return <Button onClick={() => { beginLoad(); setOpen(true); }} type="button" variant="outline">Inspecionar evidências ({totalRecords})</Button>;
  }

  return (
    <section aria-label="Evidências da validação" className="space-y-4 rounded-md border bg-background p-4">
      <div className="flex flex-wrap items-end gap-3">
        <form className="min-w-72 flex-1" onSubmit={(event) => { event.preventDefault(); beginLoad(); setPage(1); setSearch(searchDraft.trim()); }}>
          <Label htmlFor={`evidence-search-${reportId}`}>Localizar URL</Label>
          <div className="mt-1 flex gap-2">
            <Input id={`evidence-search-${reportId}`} onChange={(event) => setSearchDraft(event.target.value)} placeholder="Parte da URL" value={searchDraft} />
            <Button type="submit" variant="outline">Buscar</Button>
          </div>
        </form>
        <div className="flex items-center gap-2 pb-2">
          <Checkbox
            aria-label="Somente URLs com problemas"
            checked={filter === "issues"}
            id={`evidence-issues-${reportId}`}
            onCheckedChange={(checked) => { beginLoad(); setFilter(checked === true ? "issues" : "all"); setPage(1); }}
          />
          <Label htmlFor={`evidence-issues-${reportId}`}>Somente URLs com problemas</Label>
        </div>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Carregando evidências…</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!loading && !error && result?.data.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma evidência corresponde aos filtros.</p>}

      {result && result.data.length > 0 && (
        <div className="grid gap-4 xl:grid-cols-[22rem_1fr]">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{result.meta.total} URL(s) encontrada(s)</p>
            <ol className="space-y-2">
              {result.data.map((record) => (
                <li className={record.id === selectedId ? "rounded-md border border-primary bg-primary/5 p-3" : "rounded-md border p-3"} key={record.id}>
                  <button aria-current={record.id === selectedId ? "true" : undefined} className="w-full cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setSelectedId(record.id)} type="button">
                    <span className="block font-medium">{record.is_valid ? (recordWarnings(record).length > 0 ? `Válido com ${recordWarnings(record).length} aviso(s)` : "Registro válido") : `Falha crítica · ${record.errors.length} erro(s)${recordWarnings(record).length > 0 ? ` · ${recordWarnings(record).length} aviso(s)` : ""}`}</span>
                  </button>
                  <a className="mt-1 block break-all text-sm underline" href={record.url} rel="noreferrer" target="_blank">{record.url}</a>
                </li>
              ))}
            </ol>
            <div className="flex items-center justify-between gap-2">
              <Button disabled={result.meta.current_page <= 1} onClick={() => { beginLoad(); setPage((current) => current - 1); }} size="sm" type="button" variant="outline">Anterior</Button>
              <span className="text-sm">Página {result.meta.current_page} de {result.meta.last_page}</span>
              <Button disabled={result.meta.current_page >= result.meta.last_page} onClick={() => { beginLoad(); setPage((current) => current + 1); }} size="sm" type="button" variant="outline">Próxima</Button>
            </div>
          </div>

          {selected && (
            <article className="space-y-4" aria-label={`Evidência ${selected.url}`}>
              <div><p className="text-sm text-muted-foreground">URL selecionada</p><a className="break-all font-medium underline" href={selected.url} rel="noreferrer" target="_blank">{selected.url}</a></div>
              {selected.errors.length > 0 && <div><h5 className="font-semibold text-destructive">Erros</h5><ul className="mt-1 list-disc pl-5 text-sm">{selected.errors.map((item) => <li key={item}>{item}</li>)}</ul></div>}
              {selectedWarnings.length > 0 && <div><h5 className="font-semibold text-amber-700">Avisos</h5><ul className="mt-1 list-disc pl-5 text-sm">{selectedWarnings.map((item) => <li key={item}>{item}</li>)}</ul></div>}
              <div className="grid gap-4 lg:grid-cols-2">
                <div><h5 className="mb-2 font-semibold">Dado bruto</h5><EvidenceData data={selected.raw_data} emptyLabel="Nenhum dado bruto disponível." /></div>
                <div><h5 className="mb-2 font-semibold">Dado normalizado</h5><EvidenceData data={selected.normalized_data} emptyLabel="Nenhum dado normalizado disponível." /></div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <Button disabled={selectedIndex <= 0} onClick={() => setSelectedId(result.data[selectedIndex - 1]?.id ?? null)} size="sm" type="button" variant="outline">URL anterior</Button>
                <span className="text-sm text-muted-foreground">Registro {selectedIndex + 1} de {result.data.length} nesta página</span>
                <Button disabled={selectedIndex < 0 || selectedIndex >= result.data.length - 1} onClick={() => setSelectedId(result.data[selectedIndex + 1]?.id ?? null)} size="sm" type="button" variant="outline">Próxima URL</Button>
              </div>
              <details className="rounded-md border p-3">
                <summary className="cursor-pointer font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Ver payload técnico integral</summary>
                <pre className="mt-3 max-h-96 overflow-auto rounded bg-muted p-3 text-xs">{JSON.stringify({ raw_data: selected.raw_data, normalized_data: selected.normalized_data, errors: selected.errors, field_presence: selected.field_presence }, null, 2)}</pre>
              </details>
            </article>
          )}
        </div>
      )}

      <Button onClick={() => setOpen(false)} type="button" variant="ghost">Fechar evidências</Button>
    </section>
  );
}
