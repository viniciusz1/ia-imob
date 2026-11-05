import { PropertyForm } from "@/components/properties/PropertyForm";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata = {
    title: "Novo Imóvel",
};

export default function CreatePropertyPage() {
    return (
        <div className="space-y-6">
            <PageHeader
                backHref="/properties"
                description="Preencha as etapas para criar um novo imóvel."
                title="Cadastrar imóvel"
            />
            <PropertyForm mode="create" />
        </div>
    );
}
