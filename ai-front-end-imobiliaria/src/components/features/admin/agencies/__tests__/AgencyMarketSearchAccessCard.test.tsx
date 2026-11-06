import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AgencyMarketSearchAccessCard } from "../AgencyMarketSearchAccessCard";

const mocks = vi.hoisted(() => ({ save: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/services/adminApi", () => ({
    getMarketSearchAccessOptions: async () => ({ cities: ["Joinville"], crawl_agencies: [] }),
    updateMarketSearchAccess: mocks.save,
}));
vi.mock("@/hooks/usePermission", () => ({ usePermission: () => true }));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

describe("catálogo permitido", () => {
    it("preserva o acesso irrestrito ao salvar Todas", async () => {
        render(<AgencyMarketSearchAccessCard agency={{ id: 1, name: "Agência", slug: "agencia", is_active: true, owner_user_id: null, created_at: null, updated_at: null, market_search_weekly_limit: 100 }} />);
        const save = screen.getByRole("button", { name: "Salvar catálogo" });
        await waitFor(() => expect(save).toBeEnabled());
        fireEvent.click(save);
        await waitFor(() => expect(mocks.save).toHaveBeenCalledWith(1, { allowed_cities: null, allowed_crawl_agency_ids: null }));
        fireEvent.click(screen.getByRole("switch", { name: "Todas as cidades" }));
        await waitFor(() => expect(save).toBeDisabled());
    });
});
