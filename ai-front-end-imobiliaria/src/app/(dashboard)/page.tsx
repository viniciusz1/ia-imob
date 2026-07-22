import { DashboardContent } from "./DashboardContent";

export const metadata = {
    title: "Dashboard | IA Imob",
    description: "Painel principal do sistema imobiliário",
};

export default function DashboardPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground">
                    Bem-vindo ao IA Imob — Sistema Imobiliário
                </p>
            </div>
            <DashboardContent />
        </div>
    );
}
