import type { LucideIcon } from "lucide-react";
import {
    Bot,
    Building2,
    Calculator,
    CreditCard,
    Database,
    Globe,
    LayoutDashboard,
    Shield,
    ShieldCheck,
    Users,
} from "lucide-react";

export interface WorkspaceModule {
    id: string;
    title: string;
    href: string;
    icon: LucideIcon;
    permissions: string[];
    showInSidebar: boolean;
    dashboard?: {
        title: string;
        description: string;
    };
}

export const workspaceModules: WorkspaceModule[] = [
    {
        id: "dashboard",
        title: "Dashboard",
        href: "/",
        icon: LayoutDashboard,
        permissions: [],
        showInSidebar: true,
    },
    {
        id: "properties",
        title: "Imóveis",
        href: "/properties",
        icon: Building2,
        permissions: ["properties.view"],
        showInSidebar: true,
        dashboard: {
            title: "Imóveis",
            description: "Gerencie o cadastro de imóveis",
        },
    },
    {
        id: "users",
        title: "Usuários",
        href: "/usuarios",
        icon: Users,
        permissions: ["users.view"],
        showInSidebar: true,
        dashboard: {
            title: "Usuários",
            description: "Gerencie os usuários do sistema",
        },
    },
    {
        id: "roles",
        title: "Grupos",
        href: "/grupos",
        icon: ShieldCheck,
        permissions: ["roles.manage"],
        showInSidebar: true,
        dashboard: {
            title: "Grupos",
            description: "Gerencie os grupos e permissões",
        },
    },
    {
        id: "ai-searcher",
        title: "Buscador com IA",
        href: "/ai-searcher",
        icon: Bot,
        permissions: ["properties.view"],
        showInSidebar: true,
        dashboard: {
            title: "Buscador com IA",
            description: "Encontre imóveis rapidamente usando inteligência artificial",
        },
    },
    {
        id: "valuations",
        title: "Avaliar imóvel",
        href: "/avaliacoes",
        icon: Calculator,
        permissions: ["valuations.create", "valuations.view"],
        showInSidebar: true,
        dashboard: {
            title: "Avaliar imóvel",
            description: "Avalie imóveis com base em comparáveis de mercado",
        },
    },
    {
        id: "agency-configs",
        title: "Agências importadas",
        href: "/agencias-importadas",
        icon: Database,
        permissions: ["agency_configs.view"],
        showInSidebar: true,
        dashboard: {
            title: "Agências importadas",
            description: "Configure agências e extratores de importação",
        },
    },
    {
        id: "billing",
        title: "Plano & Assinatura",
        href: "/billing",
        icon: CreditCard,
        permissions: ["subscriptions.view"],
        showInSidebar: true,
        dashboard: {
            title: "Plano & Assinatura",
            description: "Gerencie sua assinatura e dados de pagamento",
        },
    },
    {
        id: "site-settings",
        title: "Configurações do site",
        href: "/configuracoes-do-site",
        icon: Globe,
        permissions: ["site_settings.view"],
        showInSidebar: true,
        dashboard: {
            title: "Configurações do site",
            description: "Personalize a aparência do seu site público",
        },
    },
    {
        id: "administration",
        title: "Administração",
        href: "/admin/agencies",
        icon: Shield,
        permissions: ["platform.agencies.view"],
        showInSidebar: true,
        dashboard: {
            title: "Administração",
            description: "Gerencie agências e configurações da plataforma",
        },
    },
];

export const sidebarModules = workspaceModules.filter((module) => module.showInSidebar);
export const dashboardModules = workspaceModules.filter((module) => module.dashboard);
