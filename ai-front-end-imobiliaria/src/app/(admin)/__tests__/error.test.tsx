import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import AdminError from "../error";
import { clearAuthenticatedSession } from "@/services/authSessionCookie";

vi.mock("@/services/authSessionCookie", () => ({
    clearAuthenticatedSession: vi.fn(),
    markAuthenticatedSession: vi.fn(),
}));

describe("AdminError", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders generic error and retry button for regular errors", () => {
        const resetMock = vi.fn();
        const error = new Error("Database connection failed");

        render(<AdminError error={error} reset={resetMock} />);

        expect(screen.getByText("Erro ao carregar a página")).toBeInTheDocument();
        expect(screen.getByText("Database connection failed")).toBeInTheDocument();

        const retryButton = screen.getByRole("button", { name: "Tentar novamente" });
        fireEvent.click(retryButton);
        expect(resetMock).toHaveBeenCalledTimes(1);
    });

    it("clears session and displays expired session message for 401 unauthenticated errors", () => {
        const resetMock = vi.fn();
        const error = new Error("Request failed with status code 401");

        render(<AdminError error={error} reset={resetMock} />);

        expect(clearAuthenticatedSession).toHaveBeenCalledTimes(1);
        expect(screen.getByText("Sessão expirada")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Fazer login" })).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Tentar novamente" })).not.toBeInTheDocument();
    });
});
