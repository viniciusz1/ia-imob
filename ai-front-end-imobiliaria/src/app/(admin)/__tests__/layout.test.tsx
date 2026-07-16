import type { AxiosResponse } from "axios";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { authService } from "@/services/authService";
import { useAuthStore } from "@/store/useAuthStore";
import AdminLayout from "../layout";

function axiosResponse<T>(data: T): AxiosResponse<T> {
    return {
        data,
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as unknown as AxiosResponse<T>["config"],
    } as unknown as AxiosResponse<T>;
}

const mocks = vi.hoisted(() => ({
    replace: vi.fn(),
    pathname: "/admin/agencies",
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ replace: mocks.replace }),
    usePathname: () => mocks.pathname,
}));

vi.mock("@/services/authService", () => ({
    authService: {
        getUser: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
        csrfCookie: vi.fn(),
    },
}));

vi.mock("@/services/authSessionCookie", () => ({
    clearAuthenticatedSession: vi.fn(),
    markAuthenticatedSession: vi.fn(),
}));

function renderAdmin(children = <div data-testid="admin-content">Admin Content</div>) {
    return render(<AdminLayout>{children}</AdminLayout>);
}

describe("AdminLayout auth guard", () => {
    beforeEach(() => {
        useAuthStore.getState().clearAuth();
        mocks.replace.mockClear();
        document.cookie = "ia_imob_authenticated=1; path=/";
        mocks.pathname = "/admin/agencies";
    });

    afterEach(() => {
        vi.clearAllMocks();
        document.cookie = "ia_imob_authenticated=; max-age=0; path=/";
    });

    it("shows admin content after verifying a valid session", async () => {
        vi.mocked(authService.getUser).mockResolvedValueOnce(
            axiosResponse({
                id: 1,
                name: "Admin",
                email: "admin@example.com",
                permissions: ["platform.agencies.view"],
            }),
        );

        renderAdmin();

        expect(screen.getByText(/carregando/i)).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByTestId("admin-content")).toBeInTheDocument();
        });

        expect(mocks.replace).not.toHaveBeenCalled();
    });

    it("shows crawler admin content with crawler view permission", async () => {
        mocks.pathname = "/admin/crawler";
        vi.mocked(authService.getUser).mockResolvedValueOnce(
            axiosResponse({
                id: 1,
                name: "Crawler Operator",
                email: "crawler@example.com",
                permissions: ["crawler.view"],
            }),
        );

        renderAdmin();

        await waitFor(() => {
            expect(screen.getByTestId("admin-content")).toBeInTheDocument();
        });

        expect(mocks.replace).not.toHaveBeenCalled();
    });

    it("redirects to login when no session cookie exists", async () => {
        document.cookie = "ia_imob_authenticated=; max-age=0; path=/";

        renderAdmin();

        await waitFor(() => {
            expect(mocks.replace).toHaveBeenCalledWith("/login");
        });
    });

    it("redirects to dashboard when user lacks platform permission", async () => {
        vi.mocked(authService.getUser).mockResolvedValueOnce(
            axiosResponse({
                id: 1,
                name: "User",
                email: "user@example.com",
                permissions: ["properties.view"],
            }),
        );

        renderAdmin();

        await waitFor(() => {
            expect(mocks.replace).toHaveBeenCalledWith("/");
        });
    });
});
