import api, { API_PREFIX } from "./api";
import type { NewPropertiesResponse } from "@/types/newProperties";

export async function getNewProperties(): Promise<NewPropertiesResponse> {
  const response = await api.get<NewPropertiesResponse>(`${API_PREFIX}/new-properties`);

  return response.data;
}
