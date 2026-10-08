import { CircleAlert } from "lucide-react";

import { getProperties } from "@/services/propertyService";
import { PropertiesClient } from "@/components/properties/PropertiesClient";
import { EmptyState } from "@/components/layout/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";

export const dynamic = 'force-dynamic';

export const metadata = {
    title: "Cadastro de Imóveis",
};

interface PropertiesPageProps {
    searchParams: Promise<{ [key: string]: string | undefined }>;
}

async function loadProperties(params: { [key: string]: string | undefined }) {
    try {
        return await getProperties({
            page: params.page ? Number(params.page) : 1,
            search: params.search,
            reference_code: params.reference_code,
            property_type: params.property_type,
            purpose: params.purpose,
            status: params.status,
            city: params.city,
        });
    } catch {
        return null;
    }
}

export default async function PropertiesPage({ searchParams }: PropertiesPageProps) {
    const params = await searchParams;
    const response = await loadProperties(params);

    if (!response) {
        return (
            <div className="space-y-6">
                <PageHeader
                    description="Gerencie captações, mídias e publicação."
                    title="Imóveis"
                />
                <EmptyState
                    description="Verifique se o backend está disponível e se seu usuário possui permissão."
                    icon={CircleAlert}
                    title="Erro ao carregar imóveis"
                />
            </div>
        );
    }

    return <PropertiesClient initialData={response.data} />;
}
