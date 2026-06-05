import type {
    Paginated,
    PropertyFilters,
    PublicPropertyDetail,
    PublicPropertySummary,
    SiteBranding,
} from "./types";
import { hasPropertySlug } from "./types";

// Server-side client for the White-Label public API. The tenant host is passed
// explicitly (from the [host] route segment) and forwarded as X-Tenant-Host so
// the backend resolves the tenant. The host is also baked into the URL so the
// Next fetch cache key is unique per tenant (no cross-tenant cache bleed).
const PUBLIC_API_PREFIX = "/api/v1/public";

function backendOrigin(): string {
    const raw = process.env.NEXT_PUBLIC_API_URL ?? "";
    return raw.replace(/\/api(?:\/v\d+)?\/?$/, "");
}

interface FetchOptions {
    tags?: string[];
    revalidate?: number;
}

async function publicFetch<T>(host: string, path: string, query: Record<string, string>, opts: FetchOptions): Promise<T | null> {
    const params = new URLSearchParams(query);
    // Cache discriminator so different tenants don't share a fetch cache entry.
    params.set("__tenant", host);

    const url = `${backendOrigin()}${PUBLIC_API_PREFIX}${path}?${params.toString()}`;

    const res = await fetch(url, {
        headers: {
            Accept: "application/json",
            "X-Tenant-Host": host,
        },
        next: { tags: opts.tags, revalidate: opts.revalidate ?? 300 },
    });

    if (res.status === 404) {
        return null;
    }
    if (!res.ok) {
        throw new Error(`Public API ${path} failed: ${res.status}`);
    }

    return (await res.json()) as T;
}

export async function getBranding(host: string): Promise<SiteBranding | null> {
    const json = await publicFetch<{ data: SiteBranding }>(host, "/site", {}, {
        revalidate: 300,
        tags: [`tenant:${host}`],
    });
    return json?.data ?? null;
}

export async function listProperties(
    host: string,
    filters: PropertyFilters = {},
): Promise<Paginated<PublicPropertySummary>> {
    const query: Record<string, string> = {};
    for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null && value !== "") {
            query[key] = String(value);
        }
    }

    const json = await publicFetch<Paginated<PublicPropertySummary>>(host, "/properties", query, {
        revalidate: 60,
        tags: [`tenant:${host}`],
    });

    if (!json) {
        return { data: [] };
    }

    return {
        ...json,
        data: json.data.filter(hasPropertySlug),
    };
}

export async function getProperty(host: string, slug: string): Promise<PublicPropertyDetail | null> {
    const json = await publicFetch<{ data: PublicPropertyDetail }>(host, `/properties/${encodeURIComponent(slug)}`, {}, {
        revalidate: 300,
        tags: [`tenant:${host}`, `property:${slug}`],
    });
    return json?.data ?? null;
}
