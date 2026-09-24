import api, { API_PREFIX } from "./api";

const AUCTIONS_BASE_PATH = `${API_PREFIX}/auctions`;

export type AuctionApiResource = {
    id: number;
    lot_number: string | null;
    title: string;
    description: string | null;
    property_type: string;
    canonical_url: string | null;
    
    address: string | null;
    neighborhood: string | null;
    city: string | null;
    state: string | null;
    built_area_m2: number | null;
    land_area_m2: number | null;
    occupancy_status: string;
    
    event: {
        title: string;
        sale_modality: string;
        status: string;
        auctioneer_name: string | null;
    };
    
    round: {
        round_number: number;
        starts_at: string | null;
        ends_at: string | null;
        minimum_bid: number | null;
        appraisal_value: number | null;
        status: string;
    } | null;
    
    images: string[];
    notice_url: string | null;
};

export type AuctionsCollectionResponse = {
    data: AuctionApiResource[];
    meta?: {
        current_page?: number;
        last_page?: number;
        per_page?: number;
        total?: number;
    };
};

export type AuctionFiltersParams = {
    page?: number;
    per_page?: number;
    search?: string;
    modality?: string;
    city?: string;
    sort?: string;
    direction?: "asc" | "desc";
};

export async function getAuctions(params: AuctionFiltersParams) {
    const { data } = await api.get<AuctionsCollectionResponse>(AUCTIONS_BASE_PATH, {
        params,
    });

    return {
        data: data.data ?? [],
        meta: {
            current_page: data.meta?.current_page ?? 1,
            last_page: data.meta?.last_page ?? 1,
            per_page: data.meta?.per_page ?? 12,
            total: data.meta?.total ?? 0,
        },
    };
}
