import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;

    // Define rotas não protegidas
    const isPublicPath = path === "/login" || path.startsWith("/api") || path.startsWith("/_next") || path === "/favicon.ico";

    // Em uma aplicação Sanctum SPA, o cookie XSRF-TOKEN ou laravel_session confirmam a presença de estado autenticado no browser.
    // Algumas configurações variam. Usaremos laravel_session como fallback padrão, mas checamos ambos.
    const sessionCookie = request.cookies.get("laravel_session")?.value || request.cookies.get("XSRF-TOKEN")?.value;

    if (!isPublicPath && !sessionCookie) {
        // Redireciona o visitante anônimo para o Login
        return NextResponse.redirect(new URL("/login", request.url));
    }

    if (path === "/login" && sessionCookie) {
        // Se já está logado e tentando ver telinha de login, vai pra área restrita
        return NextResponse.redirect(new URL("/usuarios", request.url));
    }

    return NextResponse.next();
}

export const config = {
    // Configura o matcher para não interferir nos estáticos do Next.js
    matcher: [
        "/((?!api|_next/static|_next/image|favicon.ico).*)",
    ],
};
