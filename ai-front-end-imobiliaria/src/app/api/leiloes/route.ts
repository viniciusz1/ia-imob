import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { initialAuctions } from "@/data/mockAuctions";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city");
  const modality = searchParams.get("modality");
  const query = searchParams.get("q")?.toLowerCase();

  let filtered = [...initialAuctions];

  if (city && city !== "all") {
    filtered = filtered.filter(
      (a) => a.property.city.toLowerCase() === city.toLowerCase()
    );
  }

  if (modality && modality !== "all") {
    filtered = filtered.filter((a) => a.event.sale_modality === modality);
  }

  if (query) {
    filtered = filtered.filter(
      (a) =>
        a.property.title?.toLowerCase().includes(query) ||
        a.property.description?.toLowerCase().includes(query) ||
        a.property.neighborhood?.toLowerCase().includes(query) ||
        a.property.address?.toLowerCase().includes(query) ||
        a.source.external_id.includes(query)
    );
  }

  return NextResponse.json({
    total: filtered.length,
    data: filtered,
  });
}
