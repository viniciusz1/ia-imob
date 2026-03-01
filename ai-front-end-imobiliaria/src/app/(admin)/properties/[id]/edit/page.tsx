import { notFound } from "next/navigation";
import { PropertyForm } from "@/components/properties/PropertyForm";
import { getPropertyById } from "@/services/propertyService";

interface EditPropertyPageProps {
    params: Promise<{ id: string }>;
}

export default async function EditPropertyPage({ params }: EditPropertyPageProps) {
    const { id } = await params;
    const propertyId = Number(id);

    if (!propertyId) {
        notFound();
    }

    try {
        const property = await getPropertyById(propertyId);

        return (
            <div className="container mx-auto py-8 space-y-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Editar Imóvel</h1>
                    <p className="text-muted-foreground mt-1">{property.title}</p>
                </div>
                <PropertyForm mode="edit" initialData={property} />
            </div>
        );
    } catch {
        notFound();
    }
}
