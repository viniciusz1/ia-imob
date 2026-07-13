import {
  Bot,
  Building2,
  Calculator,
  CreditCard,
  Globe,
  Map,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface DashboardModule {
  id: string;
  title: string;
  href: string;
  icon: LucideIcon;
  permissions: string[];
  dashboard?: {
    title: string;
    description: string;
  };
}

export const dashboardModules: DashboardModule[] = [
  {
    id: "properties",
    title: "Imóveis",
    href: "/properties",
    icon: Building2,
    permissions: [],
    dashboard: {
      title: "Gerenciar imóveis",
      description: "Cadastre, edite e acompanhe seus imóveis.",
    },
  },
  {
    id: "users",
    title: "Usuários",
    href: "/usuarios",
    icon: Users,
    permissions: ["users.view"],
  },
  {
    id: "roles",
    title: "Grupos",
    href: "/grupos",
    icon: ShieldCheck,
    permissions: ["roles.manage"],
  },
  {
    id: "ai-searcher",
    title: "Buscador com IA",
    href: "/ai-searcher",
    icon: Bot,
    permissions: [],
    dashboard: {
      title: "Buscar com IA",
      description: "Encontre imóveis usando linguagem natural.",
    },
  },
  {
    id: "valuations",
    title: "Avaliar imóvel",
    href: "/avaliacoes",
    icon: Calculator,
    permissions: ["valuations.create", "valuations.view"],
    dashboard: {
      title: "Avaliação de mercado",
      description: "Calcule valores com base em imóveis comparáveis.",
    },
  },
  {
    id: "offer-map",
    title: "Mapa de Oferta",
    href: "/mapa-de-oferta",
    icon: Map,
    permissions: ["market_insights.view"],
    dashboard: {
      title: "Mapa de Oferta",
      description: "Visualize a distribuição espacial dos anúncios por bairro.",
    },
  },
  {
    id: "billing",
    title: "Plano & Assinatura",
    href: "/billing",
    icon: CreditCard,
    permissions: ["subscriptions.view"],
  },
  {
    id: "site-settings",
    title: "Configurações do site",
    href: "/configuracoes-do-site",
    icon: Globe,
    permissions: ["site_settings.view"],
  },
];
