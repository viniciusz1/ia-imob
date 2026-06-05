export const AUTH_SESSION_COOKIE = "ia_imob_authenticated";

export function markAuthenticatedSession(remember = false) {
    if (typeof document === "undefined") return;

    const maxAge = remember ? "; max-age=2592000" : "";
    document.cookie = `${AUTH_SESSION_COOKIE}=1; path=/; SameSite=Lax${maxAge}`;
}

export function clearAuthenticatedSession() {
    if (typeof document === "undefined") return;

    document.cookie = `${AUTH_SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}
