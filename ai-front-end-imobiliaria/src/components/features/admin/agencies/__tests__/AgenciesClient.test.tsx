import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { AgenciesClient } from "../AgenciesClient";
import {
    useActivateAgency,
    useAdminAgencies,
    useDeactivateAgency,
    useUpdateAgency,
} from "@/hooks/useAdminAgencies";
import { useAuthStore } from "@/store/useAuthStore";
import type { AgencySummary } from "@/services/adminApi";

vi.mock("@/hooks/useAdminAgencies", () => ({
    useAdminAgencies: vi.fn(),
    useActivateAgency: vi.fn(),
    useDeactivateAgency: vi.fn(),
    useUpdateAgency: vi.fn(),
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const mockAgencies: AgencySummary[] = [
    {
        id: 1,
        name: "Acme Imóveis",
        slug: "acme",
        is_active: true,
        owner_user_id: 10,
        created_at: "2026-01-15T10:30:00Z",
        updated_at: "2026-02-20T14:00:00Z",
    },
    {
        id: 2,
        name: "Beta Imóveis",
        slug: "beta",
        is_active: false,
        owner_user_id: null,
        created_at: "2026-03-10T08:00:00Z",
        updated_at: null,
    },
];

function setUserPermissions(permissions: string[]) {
    useAuthStore.getState().setUser({
        id: 1,
        name: "Admin",
        email: "admin@example.com",
        permissions,
    });
}

describe("AgenciesClient", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useAuthStore.getState().clearAuth();

        vi.mocked(useActivateAgency).mockReturnValue({
            mutateAsync: vi.fn(),
            isPending: false,
        } as unknown as ReturnType<typeof useActivateAgency>);
        vi.mocked(useDeactivateAgency).mockReturnValue({
            mutateAsync: vi.fn(),
            isPending: false,
        } as unknown as ReturnType<typeof useDeactivateAgency>);
        vi.mocked(useUpdateAgency).mockReturnValue({
            mutateAsync: vi.fn(),
            isPending: false,
        } as unknown as ReturnType<typeof useUpdateAgency>);
    });

    it("renders agencies with name, slug, status badge, and formatted date", () => {
        vi.mocked(useAdminAgencies).mockReturnValue({
            data: mockAgencies,
            isLoading: false,
            error: null,
        } as ReturnType<typeof useAdminAgencies>);

        render(<AgenciesClient initialData={mockAgencies} />);

        expect(screen.getByRole("heading", { name: /Agências/i })).toBeInTheDocument();
        expect(screen.getByText("Acme Imóveis")).toBeInTheDocument();
        expect(screen.getByText("Beta Imóveis")).toBeInTheDocument();
        expect(screen.getByText("acme")).toBeInTheDocument();
        expect(screen.getByText("beta")).toBeInTheDocument();
        expect(screen.getByText("Ativa")).toBeInTheDocument();
        expect(screen.getByText("Inativa")).toBeInTheDocument();
        expect(screen.getByText("15/01/2026")).toBeInTheDocument();
        expect(screen.getByText("10/03/2026")).toBeInTheDocument();
    });

    it("calls deactivate mutation when clicking Desativar on an active agency", async () => {
        const deactivateMutate = vi.fn();
        vi.mocked(useAdminAgencies).mockReturnValue({
            data: mockAgencies,
            isLoading: false,
            error: null,
        } as ReturnType<typeof useAdminAgencies>);
        vi.mocked(useDeactivateAgency).mockReturnValue({
            mutateAsync: deactivateMutate,
            isPending: false,
        } as unknown as ReturnType<typeof useDeactivateAgency>);
        vi.mocked(useActivateAgency).mockReturnValue({
            mutateAsync: vi.fn(),
            isPending: false,
        } as unknown as ReturnType<typeof useActivateAgency>);

        setUserPermissions(["platform.agencies.deactivate"]);

        render(<AgenciesClient initialData={mockAgencies} />);

        const deactivateButton = screen.getByRole("button", { name: /Desativar/i });
        fireEvent.click(deactivateButton);

        await waitFor(() => {
            expect(deactivateMutate).toHaveBeenCalledWith(1);
        });
    });

    it("calls activate mutation when clicking Ativar on an inactive agency", async () => {
        const activateMutate = vi.fn();
        vi.mocked(useAdminAgencies).mockReturnValue({
            data: mockAgencies,
            isLoading: false,
            error: null,
        } as ReturnType<typeof useAdminAgencies>);
        vi.mocked(useDeactivateAgency).mockReturnValue({
            mutateAsync: vi.fn(),
            isPending: false,
        } as unknown as ReturnType<typeof useDeactivateAgency>);
        vi.mocked(useActivateAgency).mockReturnValue({
            mutateAsync: activateMutate,
            isPending: false,
        } as unknown as ReturnType<typeof useActivateAgency>);

        setUserPermissions(["platform.agencies.deactivate"]);

        render(<AgenciesClient initialData={mockAgencies} />);

        const betaRow = screen.getByRole("row", { name: /Beta Imóveis/i });
        const activateButton = within(betaRow).getByRole("button", { name: /Ativar/i });
        fireEvent.click(activateButton);

        await waitFor(() => {
            expect(activateMutate).toHaveBeenCalledWith(2);
        });
    });

    it("opens edit modal, fills form, and calls update mutation", async () => {
        const updateMutate = vi.fn();
        vi.mocked(useAdminAgencies).mockReturnValue({
            data: mockAgencies,
            isLoading: false,
            error: null,
        } as ReturnType<typeof useAdminAgencies>);
        vi.mocked(useUpdateAgency).mockReturnValue({
            mutateAsync: updateMutate,
            isPending: false,
        } as unknown as ReturnType<typeof useUpdateAgency>);

        setUserPermissions(["platform.agencies.update"]);

        render(<AgenciesClient initialData={mockAgencies} />);

        const acmeRow = screen.getByRole("row", { name: /Acme Imóveis/i });
        const editButton = within(acmeRow).getByRole("button", { name: /Editar/i });
        fireEvent.click(editButton);

        const nameInput = await screen.findByLabelText(/Nome/i);
        expect(nameInput).toHaveValue("Acme Imóveis");
        expect(screen.getByLabelText(/Slug/i)).toHaveValue("acme");

        fireEvent.change(nameInput, { target: { value: "Acme Nova" } });

        const submitButton = screen.getByRole("button", { name: /Salvar Alterações/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(updateMutate).toHaveBeenCalledWith({ name: "Acme Nova", slug: "acme" });
        });
    });
});
