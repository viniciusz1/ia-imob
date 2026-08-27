export const NEW_PROPERTY_INTENDED_USES = [
  "monitor_new_listings",
  "prospect_owners",
  "match_clients",
  "follow_market",
] as const;

export type NewPropertyIntendedUse = (typeof NEW_PROPERTY_INTENDED_USES)[number];

export interface NewPropertyModuleInterest {
  id: number;
  intended_uses: NewPropertyIntendedUse[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecordNewPropertyModuleInterestInput {
  intended_uses: NewPropertyIntendedUse[];
  notes: string | null;
}
