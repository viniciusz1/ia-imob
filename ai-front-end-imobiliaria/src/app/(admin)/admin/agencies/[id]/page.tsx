import { Landmark } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getAgency } from "@/services/adminApi";
import { AgencySearchAllowanceCard } from "@/components/features/admin/agencies/AgencySearchAllowanceCard";

interface AdminAgencyDetailPageProps {
    params: Promise<{ id: string }>;
}

function formatDate(date: string | null): string {
    if (!date) return "—";
    return new Date(date).toLocaleString("pt-BR");
}

export default async function AdminAgencyDetailPage({ params }: AdminAgencyDetailPageProps) {
    const { id } = await params;
    const agency = await getAgency(Number(id));

    const details = [
        { label: "ID", value: agency.id },
        { label: "Slug", value: agency.slug },
        { label: "Owner ID", value: agency.owner_user_id ?? "—" },
        { label: "Criada em", value: formatDate(agency.created_at) },
        { label: "Atualizada em", value: formatDate(agency.updated_at) },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                backHref="/admin/agencies"
                badge={
                    <Badge variant={agency.is_active ? "success" : "muted"}>
                        {agency.is_active ? "Ativa" : "Inativa"}
                    </Badge>
                }
                description="Detalhes da agência"
                title={agency.name}
            />

            <div className="grid items-start gap-6 lg:grid-cols-2">
                <Card className="gap-0 overflow-hidden py-0">
                    <SectionHeader icon={Landmark} title="Dados da agência" />
                    <dl className="divide-y">
                        {details.map((detail) => (
                            <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-5" key={detail.label}>
                                <dt className="text-sm text-muted-foreground">{detail.label}</dt>
                                <dd className="truncate text-sm text-foreground tabular-nums">{detail.value}</dd>
                            </div>
                        ))}
                    </dl>
                </Card>

                <AgencySearchAllowanceCard agency={agency} />
            </div>
        </div>
    );
}
