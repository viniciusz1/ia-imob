import axios from "axios";
import { toast } from "sonner";
import { clearAuthenticatedSession } from "./authSessionCookie";

export const API_PREFIX = "/api/v1";

// Pega a origem do backend. As rotas web do Sanctum usam a raiz do backend,
// enquanto as rotas JSON passam pelo prefixo versionado em API_PREFIX.
const configuredBackendUrl = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL;
const backendUrl = typeof window === "undefined"
    ? (configuredBackendUrl ?? "http://localhost").replace(/\/api(?:\/v\d+)?\/?$/, "")
    : "";

function frontendOrigin(): string {
    if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL;
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
    return "http://localhost:3000";
}

const api = axios.create({
    baseURL: backendUrl,
    headers: {
        "X-Requested-With": "XMLHttpRequest",
        Accept: "application/json",
        "Content-Type": "application/json",
    },
    withCredentials: true,
    // No servidor, força o adapter fetch do axios para evitar o adapter http
    // legado do Node.js (follow-redirects), que dispara o DEP0169 por usar
    // url.parse(). No cliente mantemos o adapter padrão (XHR).
    adapter: typeof window === "undefined" ? "fetch" : undefined,
});

// Helper para ler cookies no client-side
function getCookie(name: string) {
    if (typeof document === "undefined") return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(";").shift();
    return null;
}

// Interceptor de requisição: repassar cookies no lado do servidor (SSR) e garantir CSRF no cliente
api.interceptors.request.use(async (config) => {
    if (typeof window === "undefined") {
        try {
            const { cookies } = await import("next/headers");
            const cookieStore = await cookies();
            const cookieString = cookieStore
                .getAll()
                .map((cookie) => `${cookie.name}=${cookie.value}`)
                .join("; ");
            if (cookieString) {
                config.headers.Cookie = cookieString;
                // Sanctum requires Referer or Origin to treat the request as stateful:
                config.headers.Referer = frontendOrigin();
            }
        } catch {
            // Ignorado, apenas significa que não estamos num contexto Next SSR
        }
    } else {
        // No client-side: garante que o X-XSRF-TOKEN seja enviado
        const xsrfToken = getCookie("XSRF-TOKEN");
        if (xsrfToken) {
            config.headers["X-XSRF-TOKEN"] = decodeURIComponent(xsrfToken);
        }
    }
    return config;
});

// Interceptor: tratamento global de erros
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (typeof window !== "undefined") {
            const status = error.response?.status;

            if (status === 401 || status === 419) {
                clearAuthenticatedSession();
                toast.error("Sua sessão expirou ou você não está autenticado. Por favor, faça login novamente.");
                // Removemos o 'window.location.href = /login' para evitar que a página seja
                // recarregada forçadamente (refresh). O Front-End lidará visualmente sem sumir do ar.
            } else if (status === 403) {
                toast.error("Você não tem permissão para realizar esta ação.");
            } else if (status === 404) {
                toast.error("O recurso solicitado não foi encontrado no servidor.");
            } else if (status === 422) {
                // Erros de validação (422) não exibem um toast global porque os próprios
                // componentes de formulário (ex: UserFormModal) já lêem esses erros 
                // para aplicarem um highlight diretamente nos campos correspondentes.
            } else if (status >= 500) {
                toast.error("Erro interno no servidor. Tente novamente mais tarde.");
            } else if (!error.response) {
                toast.error("Falha na conexão. Verifique se o servidor está online e sua internet.");
            }
        }

        return Promise.reject(error);
    }
);

export default api;
