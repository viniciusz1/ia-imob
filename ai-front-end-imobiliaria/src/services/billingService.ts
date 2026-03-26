import api from "@/services/api";
import type {
  SubscriptionPlan,
  TenantSubscription,
  SubscriptionCreatePayload,
} from "@/types/billing";

export async function fetchPlans(): Promise<SubscriptionPlan[]> {
  const { data } = await api.get("/api/plans");
  return data.data || data; // fallback just in case pagination or wrapper is missing
}

export async function fetchCurrentSubscription(): Promise<TenantSubscription | null> {
  try {
    const { data } = await api.get("/api/subscriptions/current");
    return data.data || data;
  } catch (error: any) {
    if (error?.response?.status === 404 || error?.response?.status === 403 || error?.response?.status === 401) {
      return null;
    }
    throw error;
  }
}

export async function createSubscription(
  payload: SubscriptionCreatePayload,
): Promise<TenantSubscription> {
  const { data } = await api.post("/api/subscriptions", payload);
  return data.data || data;
}

export async function cancelSubscription(subscriptionId: number) {
  const { data } = await api.delete(`/api/subscriptions/${subscriptionId}`);
  return data;
}

export async function changePlan(payload: { plan_slug: string; billing_type: string }) {
  const { data } = await api.post("/api/subscriptions/change-plan", payload);
  // Unwrap possible data envelope to match other services
  return data.data || data;
}
