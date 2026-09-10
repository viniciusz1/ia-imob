"use client";

import { useEffect } from "react";

import { authService } from "@/services/authService";
import { AUTH_SESSION_COOKIE, clearAuthenticatedSession } from "@/services/authSessionCookie";
import { useAuthStore } from "@/store/useAuthStore";

function hasSessionCookie(): boolean {
    if (typeof document === "undefined") return false;
    return document.cookie.includes(`${AUTH_SESSION_COOKIE}=1`);
}

export function RestoreAuthSession() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    useEffect(() => {
        if (isAuthenticated || !hasSessionCookie()) return;

        authService
            .getUser()
            .then((response) => {
                useAuthStore.getState().setUser(response.data.data ?? response.data);
            })
            .catch(() => {
                clearAuthenticatedSession();
                useAuthStore.getState().clearAuth();
            });
    }, [isAuthenticated]);

    return null;
}
