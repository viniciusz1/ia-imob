import type { MetadataRoute } from "next";
import { headers } from "next/headers";

export default async function robots(): Promise<MetadataRoute.Robots> {
    const headersList = await headers();
    const host = headersList.get("host") ?? "";
    const proto = headersList.get("x-forwarded-proto") ?? "https";
    const origin = `${proto}://${host}`;

    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: ["/site/", "/api/"],
        },
        sitemap: `${origin}/sitemap.xml`,
    };
}
