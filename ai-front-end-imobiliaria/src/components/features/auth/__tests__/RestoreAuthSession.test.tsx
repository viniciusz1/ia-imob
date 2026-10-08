import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RestoreAuthSession } from "../RestoreAuthSession";
import { authService } from "@/services/authService";
import { useAuthStore } from "@/store/useAuthStore";

vi.mock("@/services/authService", () => ({
    authService: { getUser: vi.fn() },
}));

const user = {
    id: 5,
    name: "Administrador",
    email: "admin@imobiliaria.com",
    is_platform_admin: false,
    permissions: ["properties.view", "analytics.market.view"],
};

describe("RestoreAuthSession", () => {
    beforeEach(() => {
        useAuthStore.getState().clearAuth();
        document.cookie = "ia_imob_authenticated=1; path=/";
    });

    afterEach(() => {
        vi.clearAllMocks();
        document.cookie = "ia_imob_authenticated=; path=/; max-age=0";
    });

    it("reloads the user and its permissions when the store is empty", async () => {
        vi.mocked(authService.getUser).mockResolvedValue({ data: { data: user } });

        render(<RestoreAuthSession />);

        await waitFor(() =>
            expect(useAuthStore.getState().user?.permissions).toContain("analytics.market.view"),
        );
    });

    it("does not call the api when the store already holds the user", () => {
        useAuthStore.getState().setUser(user);

        render(<RestoreAuthSession />);

        expect(authService.getUser).not.toHaveBeenCalled();
    });

    it("does not call the api without a session cookie", () => {
        document.cookie = "ia_imob_authenticated=; path=/; max-age=0";

        render(<RestoreAuthSession />);

        expect(authService.getUser).not.toHaveBeenCalled();
    });

    it("clears the session when the api rejects the cookie", async () => {
        vi.mocked(authService.getUser).mockRejectedValue(new Error("401"));

        render(<RestoreAuthSession />);

        await waitFor(() => expect(useAuthStore.getState().isAuthenticated).toBe(false));
        expect(document.cookie).not.toContain("ia_imob_authenticated=1");
    });
});
