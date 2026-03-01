import { PropertyForm } from "@/components/properties/PropertyForm";

export const metadata = {
    title: "Novo Imóvel",
};

export default function CreatePropertyPage() {
    return (
        <div className="container mx-auto py-8 space-y-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Cadastrar Imóvel</h1>
                <p className="text-muted-foreground mt-1">
                    Preencha as etapas para criar um novo imóvel.
                </p>
            </div>
            <PropertyForm mode="create" />
        </div>
    );
}
