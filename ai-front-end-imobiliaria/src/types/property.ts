export interface SelectOption {
    value: string;
    label: string;
}

export interface SystemEnum {
    tag: "property_types" | "property_purposes" | "property_statuses" | string;
    data: SelectOption[];
}

export interface PropertyFeature {
    id: number;
    name: string;
    icon: string | null;
}

export interface PropertyImage {
    id: number;
    url: string;
    is_cover: boolean;
    order: number;
    description: string | null;
}

export interface Property {
    id: number;
    reference_code: string;
    title: string;
    description: string | null;
    property_type: string;
    purpose: string;
    status: string;
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
    sale_price: number | null;
    rent_price: number | null;
    property_tax: number | null;
    condo_fee: number | null;
    accepts_financing: boolean;
    accepts_exchange: boolean;
    show_price: boolean;
    usable_area: number | null;
    total_area: number | null;
    bedrooms: number;
    suites: number;
    bathrooms: number;
    garage_spaces: number;
    floor_number: number | null;
    total_floors: number | null;
    build_year: number | null;
    video_url: string | null;
    virtual_tour_url: string | null;
    owner_id: number | null;
    broker_id: number | null;
    internal_notes: string | null;
    has_exclusive_right: boolean;
    exclusive_right_expiration_date: string | null;
    keys_location: string | null;
    is_published: boolean;
    is_highlighted: boolean;
    images: PropertyImage[];
    features: PropertyFeature[];
    created_at: string;
    updated_at: string;
}

export interface PropertyFiltersParams {
    page?: number;
    per_page?: number;
    search?: string;
    reference_code?: string;
    property_type?: string;
    purpose?: string;
    status?: string;
    city?: string;
}

export interface PaginatedPropertiesResponse {
    data: Property[];
    meta: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
}

export interface PropertyFormData {
    reference_code: string;
    title: string;
    description: string | null;
    property_type: string;
    purpose: string;
    status: string;
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
    sale_price: number | null;
    rent_price: number | null;
    property_tax: number | null;
    condo_fee: number | null;
    accepts_financing: boolean;
    accepts_exchange: boolean;
    show_price: boolean;
    usable_area: number | null;
    total_area: number | null;
    bedrooms: number;
    suites: number;
    bathrooms: number;
    garage_spaces: number;
    floor_number: number | null;
    total_floors: number | null;
    build_year: number | null;
    video_url: string | null;
    virtual_tour_url: string | null;
    owner_id: number | null;
    broker_id: number | null;
    internal_notes: string | null;
    has_exclusive_right: boolean;
    exclusive_right_expiration_date: string | null;
    keys_location: string | null;
    is_published: boolean;
    is_highlighted: boolean;
    features: number[];
}

export interface PropertyImageUploadPayload {
    image: File;
    description?: string;
    is_cover?: boolean;
}
