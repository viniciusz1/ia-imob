// Types for the White-Label public site, mirroring the backend public API
// resources (PublicPropertyResource / PublicPropertyDetailResource / SiteSettingsResource).

export type Money = number | string | null;

export interface PublicPropertyLocation {
    state?: string;
    city?: string;
    neighborhood?: string;
    street?: string;
    number?: string;
    complement?: string;
    latitude?: number;
    longitude?: number;
    show_exact_address: boolean;
}

export interface PublicPropertyPricing {
    show_price: boolean;
    sale_price: Money;
    rent_price: Money;
    accepts_financing: boolean;
    accepts_exchange: boolean;
    property_tax?: Money;
    condo_fee?: Money;
}

export interface PublicPropertyCharacteristics {
    bedrooms: number;
    suites: number;
    bathrooms: number;
    garage_spaces: number;
    usable_area: Money;
    total_area: Money;
    floor_number?: number | null;
    total_floors?: number | null;
    build_year?: number | null;
}

export interface PublicPropertySummary {
    slug: string | null;
    reference_code: string;
    title: string;
    property_type: string;
    purpose: string;
    is_highlighted: boolean;
    characteristics: PublicPropertyCharacteristics;
    location: PublicPropertyLocation;
    pricing: PublicPropertyPricing;
    cover_image: string | null;
}

export type LinkablePublicPropertySummary = PublicPropertySummary & {
    slug: string;
};

export function hasPropertySlug(property: PublicPropertySummary): property is LinkablePublicPropertySummary {
    if (typeof property.slug !== "string") {
        return false;
    }

    const slug = property.slug.trim();

    return slug.length > 0 && slug.toLowerCase() !== "null";
}

export interface PublicPropertyImage {
    url: string;
    is_cover: boolean;
    description: string | null;
}

export interface PublicBroker {
    name: string;
    creci: string | null;
    phone: string | null;
    avatar: string | null;
    facebook_link: string | null;
    instagram_link: string | null;
    description: string | null;
}

export interface PublicPropertyDetail extends PublicPropertySummary {
    description: string | null;
    media: {
        video_url: string | null;
        virtual_tour_url: string | null;
        images: PublicPropertyImage[];
    };
    features: string[];
    broker: PublicBroker | null;
}

export interface SiteBranding {
    name: string;
    slug: string;
    theme_slug: string;
    logo: string | null;
    favicon: string | null;
    palette: {
        primary: string;
        secondary: string;
        accent: string;
        bg: string;
        surface: string;
        text: string;
        muted: string;
    };
    contact: {
        whatsapp: string | null;
        facebook: string | null;
        instagram: string | null;
    };
    analytics: {
        google_analytics_id: string | null;
        meta_pixel_id: string | null;
    };
    content: {
        hero_title: string | null;
        hero_subtitle: string | null;
        about_text: string | null;
    };
}

export interface Paginated<T> {
    data: T[];
    meta?: {
        current_page: number;
        last_page: number;
        total: number;
        per_page: number;
    };
}

export interface PropertyFilters {
    purpose?: string;
    property_type?: string;
    city?: string;
    neighborhood?: string;
    search?: string;
    reference_code?: string;
    min_price?: string | number;
    max_price?: string | number;
    min_area?: string | number;
    bedrooms?: string | number;
    bathrooms?: string | number;
    garage_spaces?: string | number;
    is_highlighted?: string | number;
    order_by?: string;
    direction?: string;
    per_page?: string | number;
    page?: string | number;
}
