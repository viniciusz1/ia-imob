"use client";

// PROTOTYPE — Three variants for choosing a sample URL from a Discovery Snapshot, switchable via ?variant=.
import { Check, ChevronDown, ExternalLink, Link2, List, LoaderCircle, Search, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listDiscoverySnapshotUrls } from "@/services/crawlerService";
import type { DiscoverySnapshotUrl } from "@/types/crawler";

export type SampleUrlPrototypeVariant = "A" | "B" | "C";

interface SampleUrlPickerPrototypeProps {
  agencyId: number;
  disabled: boolean;
  onChange: (url: string) => void;
  onSuggest: () => void;
  sampleUrl: string;
  snapshotId: string;
  suggesting: boolean;
  variant: SampleUrlPrototypeVariant;
}

function useSnapshotUrls(snapshotId: string, enabled: boolean) {
  const [state, setState] = useState<{ id: string; status: "idle" | "loading" | "loaded" | "error"; urls: DiscoverySnapshotUrl[] }>({ id: "", status: "idle", urls: [] });
  const requestedSnapshotId = useRef("");

  useEffect(() => {
    if (!enabled || !snapshotId || requestedSnapshotId.current === snapshotId) return;
    let active = true;
    requestedSnapshotId.current = snapshotId;
    void listDiscoverySnapshotUrls(Number(snapshotId), 1, 100)
      .then((page) => { if (active) setState({ id: snapshotId, status: "loaded", urls: page.data }); })
      .catch(() => { if (active) setState({ id: snapshotId, status: "error", urls: [] }); });
    return () => {
      active = false;
      requestedSnapshotId.current = "";
    };
  }, [enabled, snapshotId]);

  return enabled && snapshotId !== "" && state.id !== snapshotId
    ? { id: snapshotId, status: "loading" as const, urls: [] }
    : state;
}

function UrlRows({ onSelect, query = "", selected, urls }: { onSelect: (url: string) => void; query?: string; selected: string; urls: DiscoverySnapshotUrl[] }) {
  const filtered = useMemo(() => urls.filter((item) => item.url.toLowerCase().includes(query.toLowerCase())), [query, urls]);
  if (filtered.length === 0) return <p className="p-4 text-sm text-muted-foreground">Nenhuma URL encontrada.</p>;
  return (
    <div className="max-h-64 divide-y overflow-y-auto">
      {filtered.map((item) => (
        <button className="flex w-full items-center gap-3 p-3 text-left hover:bg-accent" key={item.id} onClick={() => onSelect(item.url)} type="button">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full border">{selected === item.url && <Check className="size-3.5" />}</span>
          <span className="min-w-0 flex-1 truncate text-sm">{item.url}</span>
          <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
        </button>
      ))}
    </div>
  );
}

function LoadingState({ status }: { status: "idle" | "loading" | "loaded" | "error" }) {
  if (status === "loading") return <p className="flex items-center gap-2 p-4 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />Carregando URLs do snapshot…</p>;
  if (status === "error") return <p className="p-4 text-sm text-destructive">Não foi possível carregar as URLs do snapshot.</p>;
  return null;
}

function ManualInput({ agencyId, onChange, sampleUrl }: Pick<SampleUrlPickerPrototypeProps, "agencyId" | "onChange" | "sampleUrl">) {
  return <Input aria-describedby={`profile-sample-url-help-${agencyId}`} id={`profile-sample-url-${agencyId}`} onChange={(event) => onChange(event.target.value)} placeholder="https://imobiliaria.com/imovel/..." type="url" value={sampleUrl} />;
}

function VariantA(props: SampleUrlPickerPrototypeProps) {
  const [open, setOpen] = useState(false);
  const state = useSnapshotUrls(props.snapshotId, open);
  return (
    <div className="space-y-2">
      <Label htmlFor={`profile-sample-url-${props.agencyId}`}>URL de amostra</Label>
      <div className="flex flex-col gap-2 lg:flex-row">
        <ManualInput {...props} />
        <Button aria-expanded={open} onClick={() => setOpen((value) => !value)} type="button" variant="outline"><List />Escolher do snapshot<ChevronDown className={`transition-transform ${open ? "rotate-180" : ""}`} /></Button>
        <Button disabled={props.disabled} onClick={props.onSuggest} type="button" variant="outline"><Sparkles />{props.suggesting ? "Buscando…" : "Sugerir pela home"}</Button>
      </div>
      <p className="text-xs text-muted-foreground" id={`profile-sample-url-help-${props.agencyId}`}>Digite uma URL, escolha uma das URLs descobertas ou peça uma sugestão automática.</p>
      {open && <div className="overflow-hidden rounded-md border bg-background"><div className="border-b bg-muted/30 px-3 py-2 text-sm font-medium">URLs do snapshot selecionado</div><LoadingState status={state.status} />{state.status === "loaded" && <UrlRows onSelect={(url) => { props.onChange(url); setOpen(false); }} selected={props.sampleUrl} urls={state.urls} />}</div>}
    </div>
  );
}

function VariantB(props: SampleUrlPickerPrototypeProps) {
  const [source, setSource] = useState("snapshot");
  const state = useSnapshotUrls(props.snapshotId, source === "snapshot");
  return (
    <div className="rounded-lg border p-4">
      <div className="mb-3"><p className="font-medium">Como deseja definir a URL de amostra?</p><p className="text-xs text-muted-foreground">Você poderá revisar a escolha antes de gerar o perfil.</p></div>
      <Tabs onValueChange={setSource} value={source}>
        <TabsList className="grid h-auto w-full grid-cols-3">
          <TabsTrigger value="snapshot"><List />Snapshot</TabsTrigger>
          <TabsTrigger value="manual"><Link2 />Digitar URL</TabsTrigger>
          <TabsTrigger value="suggestion"><Sparkles />Sugestão</TabsTrigger>
        </TabsList>
        <TabsContent className="mt-3 overflow-hidden rounded-md border" value="snapshot"><LoadingState status={state.status} />{state.status === "loaded" && <UrlRows onSelect={props.onChange} selected={props.sampleUrl} urls={state.urls} />}</TabsContent>
        <TabsContent className="mt-3 space-y-2" value="manual"><Label htmlFor={`profile-sample-url-${props.agencyId}`}>Cole a URL do imóvel</Label><ManualInput {...props} /></TabsContent>
        <TabsContent className="mt-3 rounded-md border bg-muted/20 p-4" value="suggestion"><p className="mb-3 text-sm text-muted-foreground">Vamos analisar a home da imobiliária e procurar uma página de imóvel adequada.</p><Button disabled={props.disabled} onClick={props.onSuggest} type="button"><Sparkles />{props.suggesting ? "Buscando sugestão…" : "Buscar sugestão pela home"}</Button></TabsContent>
      </Tabs>
      {props.sampleUrl && <div className="mt-3 rounded-md bg-primary/5 p-3 text-sm"><span className="font-medium">URL escolhida: </span><span className="break-all">{props.sampleUrl}</span></div>}
    </div>
  );
}

function VariantC(props: SampleUrlPickerPrototypeProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const state = useSnapshotUrls(props.snapshotId, open);
  return (
    <div className="space-y-2">
      <Label htmlFor={`profile-sample-url-${props.agencyId}`}>URL de amostra</Label>
      <div className="flex flex-col gap-2 lg:flex-row">
        <ManualInput {...props} />
        <Dialog onOpenChange={setOpen} open={open}>
          <DialogTrigger asChild><Button type="button" variant="outline"><Search />Buscar no snapshot</Button></DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader><DialogTitle>Escolher URL do Snapshot #{props.snapshotId}</DialogTitle><DialogDescription>Procure entre as URLs encontradas no Discovery e selecione uma página de imóvel.</DialogDescription></DialogHeader>
            <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Filtrar URLs" className="pl-9" onChange={(event) => setQuery(event.target.value)} placeholder="Filtrar por trecho da URL…" value={query} /></div>
            <div className="overflow-hidden rounded-md border"><LoadingState status={state.status} />{state.status === "loaded" && <UrlRows onSelect={(url) => { props.onChange(url); setOpen(false); }} query={query} selected={props.sampleUrl} urls={state.urls} />}</div>
          </DialogContent>
        </Dialog>
        <Button disabled={props.disabled} onClick={props.onSuggest} type="button" variant="ghost"><Sparkles />{props.suggesting ? "Buscando…" : "Sugerir pela home"}</Button>
      </div>
      <p className="text-xs text-muted-foreground" id={`profile-sample-url-help-${props.agencyId}`}>Página de imóvel usada como referência pela geração dos seletores.</p>
    </div>
  );
}

export function SampleUrlPickerPrototype(props: SampleUrlPickerPrototypeProps) {
  if (props.variant === "B") return <VariantB {...props} />;
  if (props.variant === "C") return <VariantC {...props} />;
  return <VariantA {...props} />;
}
