export type ResidentialType = "house" | "apartment" | "townhouse";

export type ValuationStatus = "calculated" | "insufficient_sample";

export type ComparableReviewStatus = "pending" | "approved" | "rejected";

export type ComparableReviewDecision = Exclude<ComparableReviewStatus, "pending">;

export interface ValuationInput {
  city: string;
  neighborhood: string;
  residential_type: ResidentialType;
  area: number;
  bedrooms: number;
  bathrooms: number;
  garage_spaces: number;
  flood_risk: boolean;
}

export interface ComparableReview {
  scrapy_property_id: number;
  status: ComparableReviewDecision;
}

export interface CreateValuationInput extends ValuationInput {
  comparable_reviews?: ComparableReview[];
}

export interface ValuationRange {
  min: number;
  central: number;
  max: number;
  display: {
    min: string;
    central: string;
    max: string;
  };
}

export interface SubjectProperty {
  city: string;
  neighborhood: string;
  residential_type: ResidentialType;
  residential_type_label: string;
  area: number;
  bedrooms: number;
  bathrooms: number;
  garage_spaces: number;
  flood_risk: boolean;
}

export interface SampleSummary {
  total_found?: number;
  invalid_count?: number;
  outlier_count?: number;
  used_count?: number;
  bathrooms_relaxed?: boolean;
  minimum_required?: number;
}

export interface ComparableEvidence {
  scrapy_property_id: number;
  residential_type: ResidentialType;
  raw_type: string;
  city: string;
  neighborhood: string;
  bedrooms: number;
  bathrooms: number;
  garage_spaces: number;
  area: number;
  price: number;
  price_per_square_meter: number;
  agency: string | null;
  link: string | null;
  review_status?: ComparableReviewStatus;
}

export interface ComparableCandidate extends ComparableEvidence {
  review_status: ComparableReviewStatus;
}

export interface ValuationUser {
  id: number;
  name: string;
  email: string;
}

export interface Valuation {
  id: number;
  code: string;
  status: ValuationStatus;
  status_label: string;
  subject_property: SubjectProperty;
  base_range: ValuationRange | null;
  final_range: ValuationRange | null;
  flood_adjustment_percent: number | null;
  sample_summary: SampleSummary;
  comparable_evidence: ComparableEvidence[];
  can_download_report: boolean;
  calculation_summary: string;
  created_by?: ValuationUser;
  created_at: string;
}

export interface PaginatedValuationsResponse {
  data: Valuation[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
}
