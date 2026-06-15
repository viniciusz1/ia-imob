import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "../api";
import {
    activateAgency,
    createAgency,
    deactivateAgency,
    getAgency,
    listAgencies,
    updateAgency,
} from "../adminApi";

vi.mock("../api", () => ({
    default: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
    API_PREFIX: "/api/v1",
}));

beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
    vi.mocked(api.put).mockReset();
});

describe("adminApi", () => {
    it("listAgencies calls GET /api/v1/admin/agencies and unwraps data.data", async () => {
        const mockAgencies = [
            { id: 1, name: "Acme", slug: "acme", is_active: true, owner_user_id: null, created_at: null, updated_at: null },
        ];
        vi.mocked(api.get).mockResolvedValue({ data: { data: mockAgencies } });

        const result = await listAgencies();

        expect(api.get).toHaveBeenCalledWith("/api/v1/admin/agencies");
        expect(result).toEqual(mockAgencies);
    });

    it("getAgency calls GET /api/v1/admin/agencies/:id and unwraps data.data", async () => {
        const mockAgency = { id: 1, name: "Acme", slug: "acme", is_active: true, owner_user_id: null, created_at: null, updated_at: null };
        vi.mocked(api.get).mockResolvedValue({ data: { data: mockAgency } });

        const result = await getAgency(1);

        expect(api.get).toHaveBeenCalledWith("/api/v1/admin/agencies/1");
        expect(result).toEqual(mockAgency);
    });

    it("createAgency calls POST /api/v1/admin/agencies with payload", async () => {
        const mockAgency = { id: 2, name: "Nova", slug: "nova", is_active: true, owner_user_id: null, created_at: null, updated_at: null };
        vi.mocked(api.post).mockResolvedValue({ data: { data: mockAgency } });

        const payload = {
            agency: { name: "Nova", slug: "nova" },
            admin: { name: "Admin", email: "a@b.com", username: "admin1", password: "12345678", password_confirmation: "12345678" },
        };
        const result = await createAgency(payload);

        expect(api.post).toHaveBeenCalledWith("/api/v1/admin/agencies", payload);
        expect(result).toEqual(mockAgency);
    });

    it("updateAgency calls PUT /api/v1/admin/agencies/:id with payload", async () => {
        const mockAgency = { id: 1, name: "Acme Nova", slug: "acme-nova", is_active: true, owner_user_id: null, created_at: null, updated_at: null };
        vi.mocked(api.put).mockResolvedValue({ data: { data: mockAgency } });

        const result = await updateAgency(1, { name: "Acme Nova", slug: "acme-nova" });

        expect(api.put).toHaveBeenCalledWith("/api/v1/admin/agencies/1", { name: "Acme Nova", slug: "acme-nova" });
        expect(result).toEqual(mockAgency);
    });

    it("activateAgency calls POST /api/v1/admin/agencies/:id/activate", async () => {
        const mockAgency = { id: 1, name: "Acme", slug: "acme", is_active: true, owner_user_id: null, created_at: null, updated_at: null };
        vi.mocked(api.post).mockResolvedValue({ data: { data: mockAgency } });

        const result = await activateAgency(1);

        expect(api.post).toHaveBeenCalledWith("/api/v1/admin/agencies/1/activate");
        expect(result).toEqual(mockAgency);
    });

    it("deactivateAgency calls POST /api/v1/admin/agencies/:id/deactivate", async () => {
        const mockAgency = { id: 1, name: "Acme", slug: "acme", is_active: false, owner_user_id: null, created_at: null, updated_at: null };
        vi.mocked(api.post).mockResolvedValue({ data: { data: mockAgency } });

        const result = await deactivateAgency(1);

        expect(api.post).toHaveBeenCalledWith("/api/v1/admin/agencies/1/deactivate");
        expect(result).toEqual(mockAgency);
    });
});
