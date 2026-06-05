import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ContactForm } from "../ContactForm";

// Mock the server action
const mockSubmitLead = vi.fn();
vi.mock("@/services/public/actions", () => ({
    submitLead: (...args: any[]) => mockSubmitLead(...args),
}));

describe("ContactForm", () => {
    beforeEach(() => {
        mockSubmitLead.mockClear();
        mockSubmitLead.mockResolvedValue({ success: true });
    });

    it("renders name, phone, email, and message fields", () => {
        render(<ContactForm host="acme.localhost" />);

        expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/telefone/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/mensagem/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /enviar/i })).toBeInTheDocument();
    });

    it("shows validation errors for empty required fields", async () => {
        render(<ContactForm host="acme.localhost" />);

        fireEvent.click(screen.getByRole("button", { name: /enviar/i }));

        await waitFor(() => {
            expect(screen.getByText("Nome é obrigatório")).toBeInTheDocument();
            expect(screen.getByText("Telefone é obrigatório")).toBeInTheDocument();
        });

        expect(mockSubmitLead).not.toHaveBeenCalled();
    });

    it("calls submitLead with form data when valid", async () => {
        mockSubmitLead.mockResolvedValue({ success: true });

        render(<ContactForm host="acme.localhost" />);

        fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: "Maria" } });
        fireEvent.change(screen.getByLabelText(/telefone/i), { target: { value: "(47) 99999-0000" } });
        fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: "maria@example.com" } });
        fireEvent.change(screen.getByLabelText(/mensagem/i), { target: { value: "Tenho interesse no imóvel." } });

        fireEvent.click(screen.getByRole("button", { name: /enviar/i }));

        await waitFor(() => {
            expect(mockSubmitLead).toHaveBeenCalledWith("acme.localhost", expect.any(FormData));
        });
    });

    it("shows success message after successful submit", async () => {
        mockSubmitLead.mockResolvedValue({ success: true });

        render(<ContactForm host="acme.localhost" />);

        fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: "Maria" } });
        fireEvent.change(screen.getByLabelText(/telefone/i), { target: { value: "(47) 99999-0000" } });

        fireEvent.click(screen.getByRole("button", { name: /enviar/i }));

        await waitFor(() => {
            expect(screen.getByText(/mensagem enviada/i)).toBeInTheDocument();
        });
    });
});
