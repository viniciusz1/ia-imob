import { ExternalLink } from "lucide-react";
import type { RankedListing } from "@/types/analytics";
import { EMPTY_VALUE, formatCount, formatCurrency, formatSquareMetrePrice } from "./format";

export function ListingRows({ items }: { items: RankedListing[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem imóveis neste recorte.</p>;
  }

  return (
    <ul className="divide-y">
      {items.map((item) => (
        <li key={item.id} className="flex items-center justify-between gap-4 py-3 first:pt-0">
          <div className="min-w-0 space-y-0.5">
            <p className="truncate font-medium">
              {item.type}
              {item.neighbourhood === null ? null : (
                <span className="text-muted-foreground"> · {item.neighbourhood}</span>
              )}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {[
                item.area === null ? null : `${formatCount(item.area)} m²`,
                item.city,
                item.agency,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div className="text-right">
              <p className="font-semibold tabular-nums">{formatCurrency(item.price)}</p>
              <p className="text-sm tabular-nums text-muted-foreground">
                {item.price_per_square_metre === null
                  ? EMPTY_VALUE
                  : formatSquareMetrePrice(item.price_per_square_metre)}
              </p>
            </div>
            {item.listing_url === null ? null : (
              <a
                href={item.listing_url}
                target="_blank"
                rel="noreferrer"
                aria-label="Abrir anúncio"
                className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
