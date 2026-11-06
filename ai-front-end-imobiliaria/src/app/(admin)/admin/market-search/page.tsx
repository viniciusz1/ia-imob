"use client";

import { useCallback, useEffect, useState } from "react";
import api, { API_PREFIX } from "@/services/api";
import { usePermission } from "@/hooks/usePermission";
import { PageHeader } from "@/components/layout/PageHeader";
import { PaginationFooter } from "@/components/layout/PaginationFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Page<T> = { data: T[]; current_page: number; last_page: number };
type User = { id: number; name: string; email: string; agency_id: number; agency: { name: string } | null; market_search_daily_limit: number; used_today: number };
type Search = { id: number; user_name: string; agency_name: string; mode: string; query: string | Record<string, unknown>; created_at: string };

export default function MarketSearchAdminPage() {
  const canManage = usePermission("platform.market-search.manage");
  const [users, setUsers] = useState<Page<User> | null>(null);
  const [history, setHistory] = useState<Page<Search> | null>(null);
  const [userPage, setUserPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [filters, setFilters] = useState({ agency_id: "", user_id: "", from: "", to: "" });
  const [applied, setApplied] = useState(filters);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const params = Object.fromEntries(Object.entries(applied).filter(([, value]) => value));
      const [u, h] = await Promise.all([
        api.get<Page<User>>(`${API_PREFIX}/admin/market-search/users`, { params: { page: userPage, ...(params.agency_id ? { agency_id: params.agency_id } : {}) } }),
        api.get<Page<Search>>(`${API_PREFIX}/admin/market-search/history`, { params: { ...params, page: historyPage } }),
      ]);
      setUsers(u.data); setHistory(h.data); setError("");
    } catch { setError("Não foi possível carregar os dados."); }
  }, [applied, userPage, historyPage]);
  useEffect(() => { const timer = setTimeout(() => { void load(); }, 0); return () => clearTimeout(timer); }, [load]);
  async function update(user: User, value: string) {
    const limit = Number(value);
    if (!Number.isInteger(limit) || limit < 0 || limit > 1000000) { setError("Informe um limite inteiro entre 0 e 1000000."); return; }
    try { await api.put(`${API_PREFIX}/admin/market-search/users/${user.id}`, { limit }); await load(); }
    catch { setError("Não foi possível salvar o limite."); }
  }
  return <div className="space-y-6">
    <PageHeader title="Buscas dos usuários" description="Acompanhe o consumo diário e o histórico de buscas da plataforma." />
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Card><CardHeader><CardTitle>Filtros</CardTitle></CardHeader><CardContent>
      <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_auto] xl:items-end" onSubmit={e => { e.preventDefault(); setHistoryPage(1); setUserPage(1); setApplied(filters); }}>
        <div className="space-y-2"><Label htmlFor="agency-filter">Imobiliária (ID)</Label><Input id="agency-filter" value={filters.agency_id} onChange={e => setFilters({ ...filters, agency_id: e.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="user-filter">Usuário (ID)</Label><Input id="user-filter" value={filters.user_id} onChange={e => setFilters({ ...filters, user_id: e.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="date-from">De</Label><DatePicker id="date-from" value={filters.from} onChange={value => setFilters({ ...filters, from: value })} /></div>
        <div className="space-y-2"><Label htmlFor="date-to">Até</Label><DatePicker id="date-to" value={filters.to} onChange={value => setFilters({ ...filters, to: value })} /></div>
        <Button type="submit">Filtrar</Button>
      </form>
    </CardContent></Card>
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="border-b py-6"><CardTitle>Limites e consumo de hoje</CardTitle></CardHeader>
      <Table><TableHeader><TableRow><TableHead>Usuário</TableHead><TableHead>Imobiliária</TableHead><TableHead>Usadas hoje</TableHead><TableHead>Limite diário</TableHead></TableRow></TableHeader><TableBody>
      {users?.data.map(user => <TableRow key={user.id}><TableCell><span className="font-medium">{user.name} ({user.id})</span><p className="text-xs text-muted-foreground">{user.email}</p></TableCell><TableCell>{user.agency?.name} ({user.agency_id})</TableCell><TableCell>{user.used_today}</TableCell><TableCell><form className="flex items-center gap-2" onSubmit={e => { e.preventDefault(); const data = new FormData(e.currentTarget); void update(user, String(data.get("limit"))); }}><Input aria-label={`Limite diário de ${user.name}`} className="w-24" key={user.market_search_daily_limit} name="limit" type="number" min="0" max="1000000" defaultValue={user.market_search_daily_limit} disabled={!canManage} /> {canManage && <Button type="submit" variant="outline" size="sm">Salvar</Button>}</form></TableCell></TableRow>)}
      {users?.data.length === 0 && <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">Nenhum usuário encontrado.</TableCell></TableRow>}
      </TableBody></Table>
      {users && <PaginationFooter page={userPage} pageCount={users.last_page} onPageChange={setUserPage} />}
    </Card>
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="border-b py-6"><CardTitle>Histórico de buscas</CardTitle></CardHeader>
      <Table><TableHeader><TableRow><TableHead>Data e hora</TableHead><TableHead>Usuário</TableHead><TableHead>Imobiliária</TableHead><TableHead>Modo</TableHead><TableHead>Busca</TableHead></TableRow></TableHeader><TableBody>
      {history?.data.map(row => <TableRow key={row.id}><TableCell>{new Date(row.created_at.endsWith("Z") ? row.created_at : `${row.created_at.replace(" ", "T")}Z`).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</TableCell><TableCell>{row.user_name}</TableCell><TableCell>{row.agency_name}</TableCell><TableCell><Badge variant="muted">{row.mode === "ai" ? "IA" : "Filtros"}</Badge></TableCell><TableCell className="max-w-lg whitespace-normal break-words">{typeof row.query === "string" ? row.query : JSON.stringify(row.query)}</TableCell></TableRow>)}
      {history?.data.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Nenhuma busca encontrada.</TableCell></TableRow>}
      </TableBody></Table>
      {history && <PaginationFooter page={historyPage} pageCount={history.last_page} onPageChange={setHistoryPage} />}
    </Card>
  </div>;
}
