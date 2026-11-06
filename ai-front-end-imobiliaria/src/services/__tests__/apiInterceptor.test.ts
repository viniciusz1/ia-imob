import { describe, it, expect, vi, beforeEach } from "vitest";
import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { toast } from "sonner";

import api from "../api";
import { clearAuthenticatedSession } from "../authSessionCookie";

vi.mock("sonner", () => ({
    toast: {
        error: vi.fn(),
        success: vi.fn(),
    },
}));

vi.mock("../authSessionCookie", () => ({
    clearAuthenticatedSession: vi.fn(),
    markAuthenticatedSession: vi.fn(),
    AUTH_SESSION_COOKIE: "ia_imob_authenticated",
}));

function createAxiosError(status: number, message = "Error"): AxiosError {
    const error = new axios.AxiosError(message);
    error.response = {
        data: { message },
        status,
        statusText: status === 401 ? "Unauthorized" : "Forbidden",
        headers: {},
        config: {} as InternalAxiosRequestConfig,
    } as AxiosResponse;
    return error;
}

describe("api client response interceptor", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("clears authenticated session cookie and toasts error on 401 response in browser", async () => {
        const error401 = createAxiosError(401, "Unauthenticated.");

        await expect(
            // @ts-expect-error accessing private interceptor handlers for testing
            api.interceptors.response.handlers[0].rejected(error401)
        ).rejects.toThrow();

        expect(clearAuthenticatedSession).toHaveBeenCalledTimes(1);
        expect(toast.error).toHaveBeenCalledWith(
            "Sua sessão expirou ou você não está autenticado. Por favor, faça login novamente."
        );
    });

    it("toasts permission error on 403 response in browser", async () => {
        const error403 = createAxiosError(403, "Forbidden");

        await expect(
            // @ts-expect-error accessing private interceptor handlers for testing
            api.interceptors.response.handlers[0].rejected(error403)
        ).rejects.toThrow();

        expect(clearAuthenticatedSession).not.toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith("Você não tem permissão para realizar esta ação.");
    });
});
