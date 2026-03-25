import api from "@/services/api";
import type {
  SubscriptionPlan,
  TenantSubscription,
  SubscriptionCreatePayload,
} from "@/types/billing";

export async function fetchPlans(): Promise<SubscriptionPlan[]> {
  const { data } = await api.get("/api/plans");
  return data;
}

export async function fetchCurrentSubscription(): Promise<TenantSubscription | null> {
  try {
    const { data } = await api.get("/api/subscriptions/current");
    return data;
  } catch (error: any) {
    if (error?.response?.status === 404) return null;
    throw error;
  }
}

export async function createSubscription(
  payload: SubscriptionCreatePayload,
): Promise<TenantSubscription> {
  const { data } = await api.post("/api/subscriptions", payload);
  return data;
}

export async function cancelSubscription(id: number): Promise<void> {
  await api.delete(`/api/subscriptions/${id}`);
}
