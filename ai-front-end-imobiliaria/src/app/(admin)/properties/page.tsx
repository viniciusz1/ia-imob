import { getProperties } from "@/services/propertyService";
import { PropertiesClient } from "@/components/properties/PropertiesClient";

export const metadata = {
    title: "Cadastro de Imóveis",
};

interface PropertiesPageProps {
    searchParams: Promise<{ [key: string]: string | undefined }>;
}

export default async function PropertiesPage({ searchParams }: PropertiesPageProps) {
    const params = await searchParams;

    try {
        const response = await getProperties({
            page: params.page ? Number(params.page) : 1,
            search: params.search,
            reference_code: params.reference_code,
            property_type: params.property_type,
            purpose: params.purpose,
            status: params.status,
            city: params.city,
        });

        return <PropertiesClient initialData={response.data} />;
    } catch {
        return (
            <div className="container mx-auto py-10">
                <h1 className="text-2xl font-bold">Erro ao carregar imóveis</h1>
                <p className="text-muted-foreground mt-2">
                    Verifique se o backend está disponível e se seu usuário possui permissão.
                </p>
            </div>
        );
    }
}
