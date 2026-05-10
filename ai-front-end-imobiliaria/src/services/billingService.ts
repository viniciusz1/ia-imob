import api, { API_PREFIX } from "@/services/api";
import type {
  SubscriptionPlan,
  TenantSubscription,
  SubscriptionCreatePayload,
} from "@/types/billing";

export async function fetchPlans(): Promise<SubscriptionPlan[]> {
  const { data } = await api.get(`${API_PREFIX}/plans`);
  return data;
}

export async function fetchCurrentSubscription(): Promise<TenantSubscription | null> {
  try {
    const { data } = await api.get(`${API_PREFIX}/subscriptions/current`);
    return data;
  } catch (error: any) {
    if (error?.response?.status === 404) return null;
    throw error;
  }
}

export async function createSubscription(
  payload: SubscriptionCreatePayload,
): Promise<TenantSubscription> {
  const { data } = await api.post(`${API_PREFIX}/subscriptions`, payload);
  return data;
}

export async function cancelSubscription(id: number): Promise<void> {
  await api.delete(`${API_PREFIX}/subscriptions/${id}`);
}
