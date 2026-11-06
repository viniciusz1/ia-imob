"use client";

import { useCallback, useEffect, useState } from "react";
import api, { API_PREFIX } from "@/services/api";
import { usePermission } from "@/hooks/usePermission";

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
  return <main className="space-y-6 p-6">
    <h1 className="text-2xl font-bold">Buscas dos usuários</h1>
    {error && <p role="alert" className="text-red-600">{error}</p>}
    <form className="flex flex-wrap gap-3" onSubmit={e => { e.preventDefault(); setHistoryPage(1); setUserPage(1); setApplied(filters); }}>
      <label>Imobiliária (ID)<input className="block rounded border p-2" value={filters.agency_id} onChange={e => setFilters({ ...filters, agency_id: e.target.value })} /></label>
      <label>Usuário (ID)<input className="block rounded border p-2" value={filters.user_id} onChange={e => setFilters({ ...filters, user_id: e.target.value })} /></label>
      <label>De<input className="block rounded border p-2" type="date" value={filters.from} onChange={e => setFilters({ ...filters, from: e.target.value })} /></label>
      <label>Até<input className="block rounded border p-2" type="date" value={filters.to} onChange={e => setFilters({ ...filters, to: e.target.value })} /></label>
      <button className="rounded bg-green-700 px-4 text-white" type="submit">Filtrar</button>
    </form>
    <section><h2 className="text-xl font-semibold">Limites e consumo de hoje</h2>
      {users?.data.length === 0 && <p>Nenhum usuário encontrado.</p>}
      <div className="overflow-auto"><table className="w-full text-left"><thead><tr><th>Usuário</th><th>Imobiliária</th><th>Usadas hoje</th><th>Limite diário</th></tr></thead><tbody>
      {users?.data.map(user => <tr key={user.id} className="border-t"><td>{user.name} ({user.id})<br />{user.email}</td><td>{user.agency?.name} ({user.agency_id})</td><td>{user.used_today}</td><td><form onSubmit={e => { e.preventDefault(); const data = new FormData(e.currentTarget); void update(user, String(data.get("limit"))); }}><input key={user.market_search_daily_limit} name="limit" type="number" min="0" max="1000000" defaultValue={user.market_search_daily_limit} disabled={!canManage} className="w-24 rounded border p-1" /> {canManage && <button className="underline" type="submit">Salvar</button>}</form></td></tr>)}
      </tbody></table></div>
      <p><button disabled={userPage <= 1} onClick={() => setUserPage(userPage - 1)}>Anterior</button> · Página {userPage} · <button disabled={!users || userPage >= users.last_page} onClick={() => setUserPage(userPage + 1)}>Próxima</button></p>
    </section>
    <section><h2 className="text-xl font-semibold">Histórico de buscas</h2>
      {history?.data.length === 0 && <p>Nenhuma busca encontrada.</p>}
      <div className="overflow-auto"><table className="w-full text-left"><thead><tr><th>Data e hora</th><th>Usuário</th><th>Imobiliária</th><th>Modo</th><th>Busca</th></tr></thead><tbody>
      {history?.data.map(row => <tr key={row.id} className="border-t align-top"><td>{new Date(row.created_at.endsWith("Z") ? row.created_at : `${row.created_at.replace(" ", "T")}Z`).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</td><td>{row.user_name}</td><td>{row.agency_name}</td><td>{row.mode === "ai" ? "IA" : "Filtros"}</td><td className="max-w-lg break-words">{typeof row.query === "string" ? row.query : JSON.stringify(row.query)}</td></tr>)}
      </tbody></table></div>
      <p><button disabled={historyPage <= 1} onClick={() => setHistoryPage(historyPage - 1)}>Anterior</button> · Página {historyPage} · <button disabled={!history || historyPage >= history.last_page} onClick={() => setHistoryPage(historyPage + 1)}>Próxima</button></p>
    </section>
  </main>;
}
