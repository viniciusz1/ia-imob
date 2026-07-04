import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { listProperties } from "@/services/public/publicApi";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const headersList = await headers();
    const host = headersList.get("host") ?? "";
    const hostname = host.split(":")[0];

    // Determine the origin for full URLs
    const proto = headersList.get("x-forwarded-proto") ?? "https";
    const origin = `${proto}://${host}`;

    // List all published properties for this agency
    const { data: properties, meta } = await listProperties(hostname, { per_page: 100 });

    const propertyEntries: MetadataRoute.Sitemap = properties.map((property) => ({
        url: `${origin}/imovel/${property.slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
    }));

    // Static pages
    const staticEntries: MetadataRoute.Sitemap = [
        {
            url: origin,
            lastModified: new Date(),
            changeFrequency: "daily" as const,
            priority: 1.0,
        },
        {
            url: `${origin}/imoveis?purpose=venda`,
            lastModified: new Date(),
            changeFrequency: "daily" as const,
            priority: 0.9,
        },
        {
            url: `${origin}/imoveis?purpose=locacao`,
            lastModified: new Date(),
            changeFrequency: "daily" as const,
            priority: 0.9,
        },
    ];

    // If there are more pages, add paginated entries
    const paginatedEntries: MetadataRoute.Sitemap = [];
    if (meta && meta.last_page > 1) {
        for (let page = 2; page <= meta.last_page; page++) {
            for (const purpose of ["venda", "locacao"]) {
                paginatedEntries.push({
                    url: `${origin}/imoveis?purpose=${purpose}&page=${page}`,
                    lastModified: new Date(),
                    changeFrequency: "daily" as const,
                    priority: 0.5,
                });
            }
        }
    }

    return [...staticEntries, ...propertyEntries, ...paginatedEntries];
}
