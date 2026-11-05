import api, { API_PREFIX } from "./api";

const AUCTIONS_BASE_PATH = `${API_PREFIX}/auctions`;
const SAVED_FILTERS_BASE_PATH = `${API_PREFIX}/saved-filters`;

export type AuctionRoundResource = {
    round_number: number;
    starts_at: string | null;
    ends_at: string | null;
    minimum_bid: number | null;
    appraisal_value: number | null;
    current_bid?: number | null;
    commission_rate?: number | null;
    status: string;
    source_label?: string | null;
};

export type AuctionApiResource = {
    id: number;
    lot_number: string | null;
    title: string;
    description: string | null;
    property_type: string;
    canonical_url: string | null;
    inventory_state?: string;

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

    round: AuctionRoundResource | null;
    rounds?: AuctionRoundResource[];

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
    property_type?: string;
    status?: string;
    min_bid?: number;
    max_bid?: number;
    date_from?: string;
    date_to?: string;
    sort?: string;
    direction?: "asc" | "desc";
};

export type SavedAuctionAlert = {
    id: number;
    name: string;
    filters: AuctionFiltersParams & {
        type?: "auction";
        created_at_label?: string;
    };
    created_at?: string;
    updated_at?: string;
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

export async function getAuctionAlerts(): Promise<SavedAuctionAlert[]> {
    const { data } = await api.get<SavedAuctionAlert[]>(SAVED_FILTERS_BASE_PATH, {
        params: { type: "auction" },
    });
    return data ?? [];
}

export async function saveAuctionAlert(
    name: string,
    filters: AuctionFiltersParams
): Promise<SavedAuctionAlert> {
    const payload = {
        name,
        filters: {
            ...filters,
            type: "auction" as const,
        },
    };
    const { data } = await api.post<SavedAuctionAlert>(SAVED_FILTERS_BASE_PATH, payload);
    return data;
}

export async function deleteAuctionAlert(id: number): Promise<void> {
    await api.delete(`${SAVED_FILTERS_BASE_PATH}/${id}`);
}
