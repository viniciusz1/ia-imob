import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { AgencySearchAllowanceCard } from "../AgencySearchAllowanceCard";
import { updateMarketSearchAllowance, type AgencySummary } from "@/services/adminApi";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
    useRouter: () => ({ refresh }),
}));

vi.mock("@/services/adminApi", async () => {
    const actual = await vi.importActual<typeof import("@/services/adminApi")>("@/services/adminApi");
    return {
        ...actual,
        updateMarketSearchAllowance: vi.fn(),
    };
});

vi.mock("sonner", () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

const agency: AgencySummary = {
    id: 3,
    name: "Aragão e Vega",
    slug: "aragao-e-vega",
    is_active: true,
    owner_user_id: null,
    created_at: "2026-08-01T16:15:15Z",
    updated_at: "2026-08-01T16:15:15Z",
    market_search_weekly_limit: 100,
    market_search_usage: {
        limit: 100,
        used: 27,
        remaining: 73,
        week_started_on: "2026-08-10",
        resets_at: "2026-08-17T00:00:00-03:00",
    },
};

describe("AgencySearchAllowanceCard", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("shows aggregate usage and updates the Agency configuration", async () => {
        vi.mocked(updateMarketSearchAllowance).mockResolvedValue({
            ...agency,
            market_search_weekly_limit: 150,
        });

        render(<AgencySearchAllowanceCard agency={agency} />);

        expect(screen.getByText("27")).toBeInTheDocument();
        expect(screen.getByText("73")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();

        fireEvent.change(screen.getByLabelText("Limite semanal"), {
            target: { value: "150" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

        await waitFor(() => {
            expect(updateMarketSearchAllowance).toHaveBeenCalledWith(3, 150);
            expect(refresh).toHaveBeenCalledOnce();
        });
    });

    it("accepts zero as a disabled allowance", async () => {
        vi.mocked(updateMarketSearchAllowance).mockResolvedValue({
            ...agency,
            market_search_weekly_limit: 0,
        });

        render(<AgencySearchAllowanceCard agency={agency} />);

        fireEvent.change(screen.getByLabelText("Limite semanal"), {
            target: { value: "0" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

        await waitFor(() => {
            expect(updateMarketSearchAllowance).toHaveBeenCalledWith(3, 0);
        });
    });
});
