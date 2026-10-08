"use client";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

const BREADCRUMB_LABELS: Record<string, string> = {
    properties: "Imóveis",
    create: "Novo imóvel",
    edit: "Editar",
    leiloes: "Leilões de imóveis",
    "ai-searcher": "Buscador com IA",
    avaliacoes: "Avaliações",
    analitico: "Análises",
    mercado: "Mercado",
    usuarios: "Usuários",
    grupos: "Grupos",
    billing: "Plano & Assinatura",
    "configuracoes-do-site": "Configurações do site",
};

const BREADCRUMB_PATH_LABELS: Record<string, string> = {
    "/avaliacoes": "Avaliar imóvel",
};

// Route segments that group pages but have no page of their own.
const UNLINKED_BREADCRUMBS = [/^\/analitico$/, /^\/properties\/[^/]+$/];

/** Topbar trail of the CRM. A client component because the patterns are RegExps. */
export function AppBreadcrumbs() {
    return (
        <Breadcrumbs
            labels={BREADCRUMB_LABELS}
            pathLabels={BREADCRUMB_PATH_LABELS}
            rootLabel="Dashboard"
            unlinkedPaths={UNLINKED_BREADCRUMBS}
        />
    );
}
