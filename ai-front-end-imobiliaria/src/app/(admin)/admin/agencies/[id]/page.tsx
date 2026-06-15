import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { getAgency } from "@/services/adminApi";

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

    return (
        <div className="container mx-auto py-8 max-w-2xl">
            <Button variant="ghost" asChild className="mb-4 pl-0">
                <Link href="/admin/agencies">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar para lista
                </Link>
            </Button>

            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <CardTitle>{agency.name}</CardTitle>
                            <CardDescription>Detalhes da agência</CardDescription>
                        </div>
                        <Badge variant={agency.is_active ? "default" : "secondary"}>
                            {agency.is_active ? "Ativa" : "Inativa"}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <dt className="text-sm text-muted-foreground">ID</dt>
                            <dd className="font-medium">{agency.id}</dd>
                        </div>
                        <div>
                            <dt className="text-sm text-muted-foreground">Slug</dt>
                            <dd className="font-medium">{agency.slug}</dd>
                        </div>
                        <div>
                            <dt className="text-sm text-muted-foreground">Owner ID</dt>
                            <dd className="font-medium">{agency.owner_user_id ?? "—"}</dd>
                        </div>
                        <div>
                            <dt className="text-sm text-muted-foreground">Criada em</dt>
                            <dd className="font-medium">{formatDate(agency.created_at)}</dd>
                        </div>
                        <div>
                            <dt className="text-sm text-muted-foreground">Atualizada em</dt>
                            <dd className="font-medium">{formatDate(agency.updated_at)}</dd>
                        </div>
                    </dl>
                </CardContent>
            </Card>
        </div>
    );
}
