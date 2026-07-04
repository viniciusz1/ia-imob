export type PlanSlug = "monthly" | "semiannual" | "annual";
export type BillingType = "BOLETO" | "CREDIT_CARD" | "PIX";
export type SubscriptionStatus =
  | "pending"
  | "active"
  | "inactive"
  | "expired"
  | "cancelled";

export interface SubscriptionPlan {
  id: number;
  name: string;
  slug: PlanSlug;
  asaasCycle: string;
  pricePerMonth: number;
  totalPrice: number;
  description: string | null;
  isActive: boolean;
}

export interface AgencySubscription {
  id: number;
  plan: SubscriptionPlan;
  billingType: BillingType;
  status: SubscriptionStatus;
  asaasSubscriptionId: string;
  nextDueDate: string | null;
  startedAt: string | null;
  endsAt: string | null;
}

export interface SubscriptionCreatePayload {
  plan_slug: PlanSlug;
  billing_type: BillingType;
}
