import api from "./api";
import type {
    Property,
    PropertyFeature,
    PropertyFiltersParams,
    PropertyFormData,
    PropertyImage,
    PropertyImageUploadPayload,
    SystemEnum,
} from "@/types/property";

const PROPERTIES_BASE_PATH = "/api/properties";
const ENUMS_BASE_PATH = "/api/enums";
const FEATURES_BASE_PATH = "/api/features";

type PropertyApiResource = {
    id: number;
    reference_code: string;
    title: string;
    description: string | null;
    property_type: string;
    purpose: string;
    status: string;
    location: {
        zip_code: string;
        state: string;
        city: string;
        neighborhood: string;
        street: string;
        number: string;
        complement: string | null;
        latitude: number | null;
        longitude: number | null;
        show_exact_address: boolean;
    };
    pricing: {
        sale_price: number | null;
        rent_price: number | null;
        property_tax: number | null;
        condo_fee: number | null;
        accepts_financing: boolean;
        accepts_exchange: boolean;
        show_price: boolean;
    };
    characteristics: {
        usable_area: number | null;
        total_area: number | null;
        bedrooms: number;
        suites: number;
        bathrooms: number;
        garage_spaces: number;
        floor_number: number | null;
        total_floors: number | null;
        build_year: number | null;
    };
    media: {
        video_url: string | null;
        virtual_tour_url: string | null;
        images?: PropertyImage[];
    };
    is_published: boolean;
    is_highlighted: boolean;
    management: {
        broker?: { id: number; name: string } | null;
        owner?: { id: number; name: string } | null;
        internal_notes: string | null;
        has_exclusive_right: boolean;
        exclusive_right_expiration_date: string | null;
        keys_location: string | null;
    };
    features?: PropertyFeature[];
    created_at: string;
    updated_at: string;
};

type PropertiesCollectionResponse = {
    data: PropertyApiResource[];
    meta?: {
        current_page?: number;
        last_page?: number;
        per_page?: number;
        total?: number;
    };
};

type PropertySingleResponse = {
    data: PropertyApiResource;
};

function mapApiPropertyToProperty(resource: PropertyApiResource): Property {
    return {
        id: resource.id,
        reference_code: resource.reference_code,
        title: resource.title,
        description: resource.description,
        property_type: resource.property_type,
        purpose: resource.purpose,
        status: resource.status,
        zip_code: resource.location.zip_code,
        state: resource.location.state,
        city: resource.location.city,
        neighborhood: resource.location.neighborhood,
        street: resource.location.street,
        number: resource.location.number,
        complement: resource.location.complement,
        latitude: resource.location.latitude,
        longitude: resource.location.longitude,
        show_exact_address: resource.location.show_exact_address,
        sale_price: resource.pricing.sale_price,
        rent_price: resource.pricing.rent_price,
        property_tax: resource.pricing.property_tax,
        condo_fee: resource.pricing.condo_fee,
        accepts_financing: resource.pricing.accepts_financing,
        accepts_exchange: resource.pricing.accepts_exchange,
        show_price: resource.pricing.show_price,
        usable_area: resource.characteristics.usable_area,
        total_area: resource.characteristics.total_area,
        bedrooms: resource.characteristics.bedrooms,
        suites: resource.characteristics.suites,
        bathrooms: resource.characteristics.bathrooms,
        garage_spaces: resource.characteristics.garage_spaces,
        floor_number: resource.characteristics.floor_number,
        total_floors: resource.characteristics.total_floors,
        build_year: resource.characteristics.build_year,
        video_url: resource.media.video_url,
        virtual_tour_url: resource.media.virtual_tour_url,
        owner_id: resource.management.owner?.id ?? null,
        broker_id: resource.management.broker?.id ?? null,
        internal_notes: resource.management.internal_notes,
        has_exclusive_right: resource.management.has_exclusive_right,
        exclusive_right_expiration_date: resource.management.exclusive_right_expiration_date,
        keys_location: resource.management.keys_location,
        is_published: resource.is_published,
        is_highlighted: resource.is_highlighted,
        images: resource.media.images ?? [],
        features: resource.features ?? [],
        created_at: resource.created_at,
        updated_at: resource.updated_at,
    };
}

function sanitizeNullableString(value: string | null): string | null {
    if (value == null) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function sanitizePayload(data: PropertyFormData): PropertyFormData {
    return {
        ...data,
        description: sanitizeNullableString(data.description),
        complement: sanitizeNullableString(data.complement),
        video_url: sanitizeNullableString(data.video_url),
        virtual_tour_url: sanitizeNullableString(data.virtual_tour_url),
        internal_notes: sanitizeNullableString(data.internal_notes),
        keys_location: sanitizeNullableString(data.keys_location),
        exclusive_right_expiration_date: sanitizeNullableString(data.exclusive_right_expiration_date),
    };
}

export async function getProperties(params: PropertyFiltersParams) {
    const { data } = await api.get<PropertiesCollectionResponse>(PROPERTIES_BASE_PATH, {
        params,
    });

    const properties = (data.data ?? []).map(mapApiPropertyToProperty);

    return {
        data: properties,
        meta: {
            current_page: data.meta?.current_page ?? 1,
            last_page: data.meta?.last_page ?? 1,
            per_page: data.meta?.per_page ?? properties.length,
            total: data.meta?.total ?? properties.length,
        },
    };
}

export async function getPropertyById(id: number): Promise<Property> {
    const { data } = await api.get<PropertySingleResponse>(`${PROPERTIES_BASE_PATH}/${id}`);
    return mapApiPropertyToProperty(data.data);
}

export async function createProperty(payload: PropertyFormData): Promise<Property> {
    const { data } = await api.post<PropertySingleResponse>(
        PROPERTIES_BASE_PATH,
        sanitizePayload(payload)
    );
    return mapApiPropertyToProperty(data.data);
}

export async function updateProperty(id: number, payload: PropertyFormData): Promise<Property> {
    const { data } = await api.put<PropertySingleResponse>(
        `${PROPERTIES_BASE_PATH}/${id}`,
        sanitizePayload(payload)
    );
    return mapApiPropertyToProperty(data.data);
}

export async function deleteProperty(id: number): Promise<void> {
    await api.delete(`${PROPERTIES_BASE_PATH}/${id}`);
}

export async function getSystemEnums(tags?: string[]): Promise<SystemEnum[]> {
    const { data } = await api.get<{ data: SystemEnum[] }>(ENUMS_BASE_PATH, {
        params: tags?.length ? { tags: tags.join(",") } : undefined,
    });
    return data.data;
}

export async function getFeatures(): Promise<PropertyFeature[]> {
    const { data } = await api.get<{ data: PropertyFeature[] }>(FEATURES_BASE_PATH);
    return data.data;
}

export async function uploadPropertyImage(
    propertyId: number,
    payload: PropertyImageUploadPayload
): Promise<PropertyImage> {
    const formData = new FormData();
    formData.append("image", payload.image);

    if (payload.description) {
        formData.append("description", payload.description);
    }

    if (typeof payload.is_cover === "boolean") {
        formData.append("is_cover", payload.is_cover ? "1" : "0");
    }

    const { data } = await api.post<{ data: PropertyImage }>(
        `${PROPERTIES_BASE_PATH}/${propertyId}/images`,
        formData
    );

    return data.data;
}

export async function deletePropertyImage(propertyId: number, imageId: number): Promise<void> {
    await api.delete(`${PROPERTIES_BASE_PATH}/${propertyId}/images/${imageId}`);
}

export async function setPropertyCoverImage(propertyId: number, imageId: number): Promise<void> {
    await api.put(`${PROPERTIES_BASE_PATH}/${propertyId}/images/${imageId}/cover`);
}

export async function reorderPropertyImages(
    propertyId: number,
    imageIdsInOrder: number[]
): Promise<void> {
    const order: Record<number, number> = {};
    imageIdsInOrder.forEach((imageId, index) => {
        order[imageId] = index + 1;
    });

    await api.post(`${PROPERTIES_BASE_PATH}/${propertyId}/images/reorder`, { order });
}
