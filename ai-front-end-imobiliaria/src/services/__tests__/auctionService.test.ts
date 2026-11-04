import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "../api";
import {
    getAuctions,
    getAuctionAlerts,
    saveAuctionAlert,
    deleteAuctionAlert,
    type AuctionFiltersParams,
} from "../auctionService";

vi.mock("../api", () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        delete: vi.fn(),
    },
    API_PREFIX: "/api/v1",
}));

beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
    vi.mocked(api.delete).mockReset();
});

describe("auctionService", () => {
    it("getAuctions forwards advanced query params including bid and date ranges", async () => {
        const mockResponse = {
            data: {
                data: [
                    {
                        id: 1,
                        title: "Casa em Leilão",
                        round: {
                            round_number: 1,
                            minimum_bid: 200000,
                            appraisal_value: 350000,
                            starts_at: "2026-11-01T10:00:00Z",
                            ends_at: "2026-11-10T18:00:00Z",
                            status: "open",
                        },
                    },
                ],
                meta: {
                    current_page: 1,
                    last_page: 1,
                    per_page: 12,
                    total: 1,
                },
            },
        };

        vi.mocked(api.get).mockResolvedValue(mockResponse);

        const params: AuctionFiltersParams = {
            search: "Jaraguá",
            city: "Jaraguá do Sul",
            modality: "judicial",
            min_bid: 150000,
            max_bid: 400000,
            date_from: "2026-11-01",
            date_to: "2026-11-30",
            sort: "price",
            direction: "asc",
        };

        const result = await getAuctions(params);

        expect(api.get).toHaveBeenCalledWith("/api/v1/auctions", {
            params,
        });
        expect(result.data).toHaveLength(1);
        expect(result.data[0].id).toBe(1);
        expect(result.meta.total).toBe(1);
    });

    it("getAuctionAlerts requests saved-filters filtered by type=auction", async () => {
        const mockAlerts = [
            {
                id: 10,
                name: "Alerta Jaraguá",
                filters: {
                    type: "auction" as const,
                    city: "Jaraguá do Sul",
                    max_bid: 300000,
                },
            },
        ];

        vi.mocked(api.get).mockResolvedValue({ data: mockAlerts });

        const result = await getAuctionAlerts();

        expect(api.get).toHaveBeenCalledWith("/api/v1/saved-filters", {
            params: { type: "auction" },
        });
        expect(result).toEqual(mockAlerts);
    });

    it("saveAuctionAlert creates a saved filter with type=auction payload", async () => {
        const mockSaved = {
            id: 11,
            name: "Novo Alerta",
            filters: {
                type: "auction" as const,
                min_bid: 100000,
                max_bid: 250000,
            },
        };

        vi.mocked(api.post).mockResolvedValue({ data: mockSaved });

        const filters: AuctionFiltersParams = {
            min_bid: 100000,
            max_bid: 250000,
        };

        const result = await saveAuctionAlert("Novo Alerta", filters);

        expect(api.post).toHaveBeenCalledWith("/api/v1/saved-filters", {
            name: "Novo Alerta",
            filters: {
                ...filters,
                type: "auction",
            },
        });
        expect(result).toEqual(mockSaved);
    });

    it("deleteAuctionAlert calls DELETE on the saved filter endpoint", async () => {
        vi.mocked(api.delete).mockResolvedValue({ data: { message: "Deleted" } });

        await deleteAuctionAlert(15);

        expect(api.delete).toHaveBeenCalledWith("/api/v1/saved-filters/15");
    });
});
