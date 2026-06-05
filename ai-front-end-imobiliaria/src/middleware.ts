import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_SESSION_COOKIE = "ia_imob_authenticated";

// The CRM host serves the authenticated dashboard; every other host is a
// Tenant's White-Label public site.
const CRM_HOST = process.env.NEXT_PUBLIC_CRM_HOST ?? "localhost";

function isCrmHost(hostname: string): boolean {
    return hostname === CRM_HOST || hostname === "127.0.0.1";
}

export function middleware(request: NextRequest) {
    const hostname = (request.headers.get("host") ?? "").split(":")[0];
    const path = request.nextUrl.pathname;

    if (!isCrmHost(hostname)) {
        // Tenant public host: no auth. Frameworks/metadata routes are
        // host-aware on their own and must not be rewritten.
        if (
            path.startsWith("/_next") ||
            path.startsWith("/api") ||
            path === "/sitemap.xml" ||
            path === "/robots.txt" ||
            path === "/favicon.ico"
        ) {
            return NextResponse.next();
        }

        // Rewrite the tenant host into the path so per-tenant route/fetch
        // caches stay isolated (Next keys caches by path, not host).
        if (!path.startsWith("/site/")) {
            const url = request.nextUrl.clone();
            url.pathname = `/site/${hostname}${path === "/" ? "" : path}`;
            return NextResponse.rewrite(url);
        }

        return NextResponse.next();
    }

    // CRM host: existing authentication behavior.
    const isPublicPath =
        path === "/login" ||
        path.startsWith("/api") ||
        path.startsWith("/sanctum") ||
        path.startsWith("/_next") ||
        path === "/favicon.ico";

    const isAuthenticated = request.cookies.get(AUTH_SESSION_COOKIE)?.value === "1";

    if (!isPublicPath && !isAuthenticated) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
