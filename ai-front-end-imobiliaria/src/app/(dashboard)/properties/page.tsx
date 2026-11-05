import { CircleAlert } from "lucide-react";
import { redirect } from "next/navigation";

import { getProperties } from "@/services/propertyService";
import { PropertiesClient } from "@/components/properties/PropertiesClient";
import { EmptyState } from "@/components/layout/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";

export const dynamic = 'force-dynamic';

// Same as DEFAULT_PAGE_SIZE; a server component can't read constants from a "use client" module.
const PAGE_SIZE = 10;

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
            per_page: PAGE_SIZE,
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

    const { current_page, last_page, total } = response.meta;

    // Past the last page (e.g. after deleting its only item): go to the last one.
    if (response.data.length === 0 && current_page > last_page) {
        const query = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined) query.set(key, value);
        });
        query.set("page", String(last_page));
        redirect(`/properties?${query.toString()}`);
    }

    return (
        <PropertiesClient
            initialData={response.data}
            page={current_page}
            pageCount={last_page}
            pageSize={PAGE_SIZE}
            total={total}
        />
    );
}
