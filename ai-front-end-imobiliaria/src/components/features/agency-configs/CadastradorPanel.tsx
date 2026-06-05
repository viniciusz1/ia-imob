"use client";

import { useCallback, useRef, useState, useMemo } from "react";
import { CheckCircle2, FlaskConical, History, Loader2, Play, RefreshCw, Terminal, XCircle } from "lucide-react";
import { toast } from "sonner";

import type { AgencyConfig } from "@/types/agencyConfig";
import {
    type CadastradorEvent,
    debugIdentity,
    debugSynthesize,
    getLatestAttempt,
    onboardAgency,
    reonboardAgency,
} from "@/services/cadastradorService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

// ── Step → percentage mapping ─────────────────────────────────────────
// Based on the Cadastrador onboarding pipeline.

const STEP_ORDER: Record<string, number> = {
    fetching: 0,
    probing_sitemap: 1,
    strategy_decided: 2,
    identity_resolved: 3,
    synthesizing_selectors: 4,
    verifying: 5,
    retrying_field: 6,
    persisting: 7,
    validating: 8,
    result: 9,
    error: 9,
};

const STEP_LABELS: Record<string, string> = {
    fetching: "Baixando homepage",
    probing_sitemap: "Procurando sitemap",
    strategy_decided: "Estratégia escolhida",
    identity_resolved: "Identidade resolvida",
    synthesizing_selectors: "Sintetizando extractors",
    verifying: "Verificando selectors",
    retrying_field: "Reintentando campos",
    persisting: "Persistindo no banco",
    validating: "Validando com Scrapy",
};

function stepPct(step: string): number {
    const idx = STEP_ORDER[step];
    if (idx == null) return 0;
    // Map 0..8 → 5%..95%
    return Math.round(5 + (idx / Object.keys(STEP_ORDER).length) * 90);
}

// ── Raw event JSON ─────────────────────────────────────────────────────

function eventMeta(evt: CadastradorEvent): string {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { type, step, ...rest } = evt as Record<string, unknown> & { step?: string };
    const entries = Object.entries(rest).filter(([, v]) => v != null && v !== "");
    if (entries.length === 0) return "";
    return entries.map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(" ");
}

// ── EventLog component ─────────────────────────────────────────────────

function EventLog({ events, busy }: { events: CadastradorEvent[]; busy: boolean }) {
    const latestStep = useMemo(() => {
        for (let i = events.length - 1; i >= 0; i--) {
            const evt = events[i];
            if (evt.type === "progress" && evt.step) return evt.step;
        }
        return null;
    }, [events]);

    const pct = latestStep ? stepPct(latestStep) : 0;
    const lastResult = events.find(e => e.type === "result");
    const hasFinished = lastResult != null;

    if (events.length === 0 && !busy) return null;

    return (
        <div className="space-y-3">
            {/* Progress bar */}
            {(busy || hasFinished) && (
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                            {busy
                                ? (latestStep ? STEP_LABELS[latestStep] ?? latestStep : "Conectando…")
                                : "Concluído"}
                        </span>
                        <span className="tabular-nums font-mono">
                            {hasFinished ? "100%" : `${pct}%`}
                        </span>
                    </div>
                    <Progress
                        value={hasFinished ? 100 : pct}
                        className="h-2 data-[state=indeterminate]:animate-pulse"
                    />
                </div>
            )}

            {/* Event list */}
            <div className="rounded-md border bg-muted/20 p-3 overflow-auto max-h-72 space-y-1.5">
                {busy && events.length === 0 && (
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                        Conectando ao cadastrador…
                    </div>
                )}

                {events.map((evt, i) => {
                    const meta = eventMeta(evt);

                    if (evt.type === "progress") {
                        const label = STEP_LABELS[evt.step as string] ?? evt.step ?? "…";
                        return (
                            <div key={i} className="text-sm flex items-start gap-2">
                                <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-blue-500 shrink-0" />
                                <div className="min-w-0">
                                    <span className="text-foreground">{label}</span>
                                    {meta && (
                                        <span className="ml-1.5 text-xs text-muted-foreground/70 truncate">
                                            ({meta})
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    }

                    if (evt.type === "result") {
                        const outcomeColor =
                            evt.outcome === "active" ? "text-green-600"
                            : evt.outcome === "saved_inactive" ? "text-yellow-600"
                            : "text-red-600";
                        return (
                            <div key={i} className="space-y-1">
                                <div className="text-sm font-medium flex items-center gap-2">
                                    <span className={`h-2 w-2 rounded-full shrink-0 ${outcomeColor.replace("text-", "bg-")}`} />
                                    <span>
                                        Resultado:{" "}
                                        <span className={outcomeColor + " font-bold"}>{evt.outcome}</span>
                                        {evt.agency_id != null && ` (ID ${evt.agency_id})`}
                                        {evt.name && ` — ${evt.name}`}
                                        {evt.domain && ` @ ${evt.domain}`}
                                    </span>
                                </div>
                                {/* Show full result payload from Python */}
                                <div className="ml-5 text-xs text-muted-foreground font-mono whitespace-pre-wrap break-all">
                                    {JSON.stringify(evt, null, 1)}
                                </div>
                            </div>
                        );
                    }

                    if (evt.type === "error") {
                        return (
                            <div key={i} className="space-y-1">
                                <div className="text-sm text-red-600 flex items-center gap-2">
                                    <XCircle className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate">{evt.message ?? evt.reason ?? "Erro desconhecido"}</span>
                                </div>
                                {/* Show raw error payload */}
                                <div className="ml-5 text-xs text-red-400 font-mono whitespace-pre-wrap break-all">
                                    {JSON.stringify(evt, null, 1)}
                                </div>
                            </div>
                        );
                    }

                    return null;
                })}
            </div>
        </div>
    );
}

// ── Props ─────────────────────────────────────────────────────────────

type CadastradorPanelProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    preSelectedAgency?: AgencyConfig | null;
    agencies: AgencyConfig[];
};

// ── Panel ─────────────────────────────────────────────────────────────

export function CadastradorPanel({ open, onOpenChange, preSelectedAgency, agencies }: CadastradorPanelProps) {
    const [activeTab, setActiveTab] = useState(preSelectedAgency ? "reonboard" : "onboard");
    const [onboardUrl, setOnboardUrl] = useState("");
    const [events, setEvents] = useState<CadastradorEvent[]>([]);
    const [busy, setBusy] = useState(false);
    const abortRef = useRef<AbortController | null>(null);

    const [reAgencyId, setReAgencyId] = useState(preSelectedAgency ? String(preSelectedAgency.id) : "");

    const [attemptAgencyId, setAttemptAgencyId] = useState(preSelectedAgency ? String(preSelectedAgency.id) : "");
    const [attemptResult, setAttemptResult] = useState<unknown>(null);
    const [attemptLoading, setAttemptLoading] = useState(false);

    const [debugUrl, setDebugUrl] = useState("");
    const [debugStrategy, setDebugStrategy] = useState<"sitemap" | "wsm">("sitemap");
    const [debugField, setDebugField] = useState("");
    const [debugResult, setDebugResult] = useState<unknown>(null);
    const [debugLoading, setDebugLoading] = useState(false);

    const handleOnboard = useCallback(() => {
        const url = onboardUrl.trim();
        if (!url) return;
        if (abortRef.current) abortRef.current.abort();
        setEvents([]);
        setBusy(true);
        const ctrl = onboardAgency(url, (evt) => {
            setEvents((prev) => [...prev, evt]);
            if (evt.type === "result" || evt.type === "error") {
                setBusy(false);
                abortRef.current = null;
            }
        });
        abortRef.current = ctrl;
    }, [onboardUrl]);

    const handleCancel = () => {
        abortRef.current?.abort();
        abortRef.current = null;
        setBusy(false);
    };

    const handleReonboard = useCallback(() => {
        const id = Number(reAgencyId);
        if (!id) return;
        if (abortRef.current) abortRef.current.abort();
        setEvents([]);
        setBusy(true);
        const ctrl = reonboardAgency(id, (evt) => {
            setEvents((prev) => [...prev, evt]);
            if (evt.type === "result" || evt.type === "error") {
                setBusy(false);
                abortRef.current = null;
            }
        });
        abortRef.current = ctrl;
    }, [reAgencyId]);

    const handleFetchAttempt = useCallback(async () => {
        const id = Number(attemptAgencyId);
        if (!id) return;
        setAttemptLoading(true);
        setAttemptResult(null);
        try {
            const agency = agencies.find((a) => a.id === id);
            const result = await getLatestAttempt(id, agency?.agency_type ?? "sitemap");
            setAttemptResult(result);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Erro ao buscar attempt.");
        } finally {
            setAttemptLoading(false);
        }
    }, [attemptAgencyId, agencies]);

    const handleDebugSynthesize = useCallback(async () => {
        const url = debugUrl.trim();
        if (!url) return;
        setDebugLoading(true);
        setDebugResult(null);
        try {
            const result = await debugSynthesize(url, debugStrategy, debugField || undefined);
            setDebugResult(result);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Erro ao executar synthesize.");
        } finally {
            setDebugLoading(false);
        }
    }, [debugUrl, debugStrategy, debugField]);

    const handleDebugIdentity = useCallback(async () => {
        const url = debugUrl.trim();
        if (!url) return;
        setDebugLoading(true);
        setDebugResult(null);
        try {
            const result = await debugIdentity(url);
            setDebugResult(result);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Erro ao resolver identidade.");
        } finally {
            setDebugLoading(false);
        }
    }, [debugUrl]);

    const reAgencyOptions = agencies.filter((a) => a.id > 0);
    const attemptAgencyOptions = agencies.filter((a) => a.id > 0);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Terminal className="h-5 w-5" />
                        Cadastrador
                    </DialogTitle>
                    <DialogDescription>
                        Onboard automático de novas imobiliárias via pipeline LLM + Scrapy.
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="w-full">
                        <TabsTrigger value="onboard" className="flex-1"><Play className="mr-1.5 h-4 w-4" /> Onboard</TabsTrigger>
                        <TabsTrigger value="reonboard" className="flex-1"><RefreshCw className="mr-1.5 h-4 w-4" /> Reonboard</TabsTrigger>
                        <TabsTrigger value="attempt" className="flex-1"><History className="mr-1.5 h-4 w-4" /> Attempt</TabsTrigger>
                        <TabsTrigger value="debug" className="flex-1"><FlaskConical className="mr-1.5 h-4 w-4" /> Debug</TabsTrigger>
                    </TabsList>

                    {/* ── Onboard ─────────────────────────────────── */}
                    <TabsContent value="onboard" className="space-y-4 pt-4">
                        <div className="flex gap-2">
                            <div className="flex-1 space-y-2">
                                <Label>URL da imobiliária</Label>
                                <Input
                                    placeholder="https://nova-imobiliaria.com.br/"
                                    value={onboardUrl}
                                    onChange={(e) => setOnboardUrl(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleOnboard()}
                                    disabled={busy}
                                />
                            </div>
                            <div className="flex items-end gap-2">
                                <Button onClick={handleOnboard} disabled={busy || !onboardUrl.trim()}>
                                    {busy ? "Onboarding…" : "Iniciar"}
                                </Button>
                                {busy && (
                                    <Button variant="outline" onClick={handleCancel}>
                                        Cancelar
                                    </Button>
                                )}
                            </div>
                        </div>
                        <EventLog events={events} busy={busy} />
                    </TabsContent>

                    {/* ── Reonboard ──────────────────────────────── */}
                    <TabsContent value="reonboard" className="space-y-4 pt-4">
                        <div className="flex gap-2">
                            <div className="flex-1 space-y-2">
                                <Label>Agência existente</Label>
                                <Select value={reAgencyId} onValueChange={setReAgencyId} disabled={busy}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione uma agência…" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {reAgencyOptions.map((a) => (
                                            <SelectItem key={a.id} value={String(a.id)}>
                                                {a.name} ({a.agency_type})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-end gap-2">
                                <Button onClick={handleReonboard} disabled={busy || !reAgencyId}>
                                    {busy ? "Reonboarding…" : "Reonboard"}
                                </Button>
                                {busy && (
                                    <Button variant="outline" onClick={handleCancel}>
                                        Cancelar
                                    </Button>
                                )}
                            </div>
                        </div>
                        <EventLog events={events} busy={busy} />
                    </TabsContent>

                    {/* ── Attempt ─────────────────────────────────── */}
                    <TabsContent value="attempt" className="space-y-4 pt-4">
                        <div className="flex gap-2">
                            <div className="flex-1 space-y-2">
                                <Label>Agência</Label>
                                <Select value={attemptAgencyId} onValueChange={setAttemptAgencyId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione uma agência…" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {attemptAgencyOptions.map((a) => (
                                            <SelectItem key={a.id} value={String(a.id)}>
                                                {a.name} ({a.agency_type})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-end">
                                <Button onClick={handleFetchAttempt} disabled={attemptLoading || !attemptAgencyId}>
                                    {attemptLoading ? "Carregando…" : "Buscar"}
                                </Button>
                            </div>
                        </div>
                        {attemptResult != null && (
                            <Card>
                                <CardHeader className="py-3">
                                    <CardTitle className="text-sm">Último attempt</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <pre className="text-xs max-h-72 overflow-auto whitespace-pre-wrap bg-muted/30 rounded p-2">
                                        {JSON.stringify(attemptResult, null, 2)}
                                    </pre>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    {/* ── Debug ───────────────────────────────────── */}
                    <TabsContent value="debug" className="space-y-4 pt-4">
                        <div className="space-y-3">
                            <div className="space-y-2">
                                <Label>URL (página de imóvel)</Label>
                                <Input
                                    placeholder="https://exemplo.com.br/imovel/123"
                                    value={debugUrl}
                                    onChange={(e) => setDebugUrl(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-3 flex-wrap">
                                <div className="space-y-2">
                                    <Label>Estratégia</Label>
                                    <Select value={debugStrategy} onValueChange={(v) => setDebugStrategy(v as "sitemap" | "wsm")}>
                                        <SelectTrigger className="w-28">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="sitemap">sitemap</SelectItem>
                                            <SelectItem value="wsm">wsm</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Campo (opcional)</Label>
                                    <Input
                                        className="w-40"
                                        placeholder="ex: bairro"
                                        value={debugField}
                                        onChange={(e) => setDebugField(e.target.value)}
                                    />
                                </div>
                                <div className="flex items-end gap-2">
                                    <Button onClick={handleDebugSynthesize} disabled={debugLoading || !debugUrl.trim()} variant="secondary">
                                        {debugLoading ? "…" : "Synthesize"}
                                    </Button>
                                    <Button onClick={handleDebugIdentity} disabled={debugLoading || !debugUrl.trim()} variant="outline">
                                        Identity
                                    </Button>
                                </div>
                            </div>
                        </div>
                        {debugResult != null && (
                            <Card>
                                <CardHeader className="py-3">
                                    <CardTitle className="text-sm">Resultado</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <pre className="text-xs max-h-72 overflow-auto whitespace-pre-wrap bg-muted/30 rounded p-2">
                                        {JSON.stringify(debugResult, null, 2)}
                                    </pre>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
