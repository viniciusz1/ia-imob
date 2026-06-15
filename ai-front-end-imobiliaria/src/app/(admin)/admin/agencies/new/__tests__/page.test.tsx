import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import AdminNewAgencyPage from "../page";
import { createAgency } from "@/services/adminApi";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/services/adminApi", () => ({
    createAgency: vi.fn(),
}));

describe("AdminNewAgencyPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("submits valid agency and admin data and redirects to the list", async () => {
        vi.mocked(createAgency).mockResolvedValue({
            id: 3,
            name: "Nova Agência",
            slug: "nova-agencia",
            is_active: true,
            owner_user_id: null,
            created_at: "2026-06-14T12:00:00Z",
            updated_at: null,
        });

        render(<AdminNewAgencyPage />);

        fireEvent.change(screen.getByLabelText(/Nome da Agência/i), {
            target: { value: "Nova Agência" },
        });
        fireEvent.change(screen.getByLabelText(/Slug/i), {
            target: { value: "nova-agencia" },
        });
        fireEvent.change(screen.getByLabelText(/Telefone da Agência/i), {
            target: { value: "11999999999" },
        });
        fireEvent.change(screen.getByLabelText(/E-mail da Agência/i), {
            target: { value: "contato@nova.com" },
        });

        fireEvent.change(screen.getByLabelText(/Nome do Administrador/i), {
            target: { value: "Admin Silva" },
        });
        fireEvent.change(screen.getByLabelText(/E-mail do Administrador/i), {
            target: { value: "admin@nova.com" },
        });
        fireEvent.change(screen.getByLabelText(/Usuário/i), {
            target: { value: "admin.silva" },
        });
        fireEvent.change(screen.getByLabelText(/Telefone do Administrador/i), {
            target: { value: "11988888888" },
        });
        fireEvent.change(screen.getByLabelText(/^Senha/i), {
            target: { value: "senhaSegura123" },
        });
        fireEvent.change(screen.getByLabelText(/Confirmar Senha/i), {
            target: { value: "senhaSegura123" },
        });

        fireEvent.click(screen.getByRole("button", { name: /Registrar Agência/i }));

        await waitFor(() => {
            expect(createAgency).toHaveBeenCalledWith({
                agency: {
                    name: "Nova Agência",
                    slug: "nova-agencia",
                    phone: "11999999999",
                    email: "contato@nova.com",
                },
                admin: {
                    name: "Admin Silva",
                    email: "admin@nova.com",
                    username: "admin.silva",
                    phone: "11988888888",
                    password: "senhaSegura123",
                    password_confirmation: "senhaSegura123",
                },
            });
        });

        expect(mockPush).toHaveBeenCalledWith("/admin/agencies");
    });

    it("shows validation error when passwords do not match", async () => {
        render(<AdminNewAgencyPage />);

        fireEvent.change(screen.getByLabelText(/Nome da Agência/i), {
            target: { value: "Nova Agência" },
        });
        fireEvent.change(screen.getByLabelText(/Slug/i), {
            target: { value: "nova-agencia" },
        });
        fireEvent.change(screen.getByLabelText(/^Senha/i), {
            target: { value: "senhaSegura123" },
        });
        fireEvent.change(screen.getByLabelText(/Confirmar Senha/i), {
            target: { value: "outraSenha" },
        });

        fireEvent.click(screen.getByRole("button", { name: /Registrar Agência/i }));

        expect(await screen.findByText(/As senhas não conferem/i)).toBeInTheDocument();
        expect(createAgency).not.toHaveBeenCalled();
    });
});
