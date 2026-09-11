export type SaleModality = "judicial" | "extrajudicial" | "administrative" | "direct_sale" | "unknown";
export type AuctionStatus = "scheduled" | "open" | "closed" | "cancelled" | "unknown";
export type OccupancyStatus = "vacant" | "occupied" | "unknown";
export type EvidenceKind = "detail" | "notice" | "registry" | "photo" | "other";

export interface AuctionSource {
  external_id: string;
  canonical_url: string;
}

export interface AuctionEvent {
  title: string;
  sale_modality: SaleModality;
  status: AuctionStatus;
  auctioneer_name: string | null;
  seller_or_court: string | null;
  published_at: string | null;
}

export interface AuctionProperty {
  lot_number: string;
  property_type: string;
  city: string;
  state: string;
  title: string | null;
  description: string | null;
  address: string | null;
  neighborhood: string | null;
  postal_code: string | null;
  built_area_m2: number | null;
  land_area_m2: number | null;
  occupancy_status: OccupancyStatus;
  registration_number: string | null;
}

export interface AuctionRound {
  round_number: number;
  starts_at: string;
  ends_at: string | null;
  appraisal_value: number | null;
  minimum_bid: number;
  current_bid: number | null;
  commission_rate: number | null;
  status: string | null;
  source_label: string | null;
}

export interface AuctionEvidence {
  kind: EvidenceKind;
  url: string;
  metadata?: Record<string, unknown> | null;
}

export interface AuctionRecord {
  domain: "auction";
  source: AuctionSource;
  event: AuctionEvent;
  property: AuctionProperty;
  rounds: AuctionRound[];
  evidence: AuctionEvidence[];
}
