import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { middleware } from "@/middleware";

function request(path: string, cookie?: string) {
    return new NextRequest(`http://localhost:3000${path}`, {
        headers: cookie ? { cookie } : undefined,
    });
}

describe("middleware auth routing", () => {
    it("keeps login public even when Sanctum CSRF cookies exist", () => {
        const response = middleware(
            request("/login", "XSRF-TOKEN=fake; laravel_session=fake"),
        );

        expect(response.status).toBe(200);
        expect(response.headers.get("location")).toBeNull();
    });

    it("redirects protected routes without the frontend auth marker", () => {
        const response = middleware(
            request("/usuarios", "XSRF-TOKEN=fake; laravel_session=fake"),
        );

        expect(response.status).toBe(307);
        expect(response.headers.get("location")).toBe("http://localhost:3000/login");
    });

    it("allows protected routes with the frontend auth marker", () => {
        const response = middleware(
            request("/usuarios", "ia_imob_authenticated=1"),
        );

        expect(response.status).toBe(200);
        expect(response.headers.get("location")).toBeNull();
    });
});
