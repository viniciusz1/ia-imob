import type { CSSProperties } from "react";
import type { SiteBranding } from "@/services/public/types";

const FALLBACK = {
    primary: "#1e3a8a",
    secondary: "#0ea5e9",
    accent: "#f59e0b",
    bg: "#ffffff",
    surface: "#f8fafc",
    text: "#0f172a",
    muted: "#64748b",
};

/** Maps a Agency's palette to the --brand-* CSS variables the Template uses. */
export function brandStyle(branding: SiteBranding | null): CSSProperties {
    const p = branding?.palette ?? FALLBACK;

    return {
        "--brand-primary": p.primary ?? FALLBACK.primary,
        "--brand-secondary": p.secondary ?? FALLBACK.secondary,
        "--brand-accent": p.accent ?? FALLBACK.accent,
        "--brand-bg": p.bg ?? FALLBACK.bg,
        "--brand-surface": p.surface ?? FALLBACK.surface,
        "--brand-text": p.text ?? FALLBACK.text,
        "--brand-muted": p.muted ?? FALLBACK.muted,
    } as CSSProperties;
}
