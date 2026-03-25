import { Bot, Building2, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
    title: "Dashboard | IA Imob",
    description: "Painel principal do sistema imobiliário",
};

const modules = [
    {
        title: "Imóveis",
        description: "Gerencie o cadastro de imóveis",
        href: "/properties",
        icon: Building2,
    },
    {
        title: "Usuários",
        description: "Gerencie os usuários do sistema",
        href: "/usuarios",
        icon: Users,
    },
    {
        title: "Grupos",
        description: "Gerencie os grupos e permissões",
        href: "/grupos",
        icon: ShieldCheck,
    },
    {
        title: "Buscador com IA",
        description: "Encontre imóveis rapidamente usando inteligência artificial",
        href: "/ai-searcher",
        icon: Bot,
    },
];

export default function DashboardPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">
                    Dashboard
                </h1>
                <p className="text-muted-foreground">
                    Bem-vindo ao IA Imob — Sistema Imobiliário
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {modules.map((mod) => (
                    <Link key={mod.href} href={mod.href}>
                        <Card className="transition-colors hover:border-primary/50 hover:shadow-md">
                            <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <mod.icon className="size-5" />
                                </div>
                                <CardTitle className="text-lg">
                                    {mod.title}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    {mod.description}
                                </p>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
