import { notFound } from "next/navigation";
import { PropertyForm } from "@/components/properties/PropertyForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { getPropertyById } from "@/services/propertyService";
import type { Property } from "@/types/property";

export const dynamic = 'force-dynamic';

interface EditPropertyPageProps {
    params: Promise<{ id: string }>;
}

async function loadProperty(id: number): Promise<Property | null> {
    try {
        return await getPropertyById(id);
    } catch {
        return null;
    }
}

export default async function EditPropertyPage({ params }: EditPropertyPageProps) {
    const { id } = await params;
    const propertyId = Number(id);

    if (!propertyId) {
        notFound();
    }

    const property = await loadProperty(propertyId);

    if (!property) {
        notFound();
    }

    return (
        <div className="space-y-6">
            <PageHeader
                backHref="/properties"
                description={property.title}
                title="Editar imóvel"
            />
            <PropertyForm mode="edit" initialData={property} />
        </div>
    );
}
