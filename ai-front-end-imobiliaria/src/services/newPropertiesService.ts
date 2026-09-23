import api, { API_PREFIX } from "./api";
import type { NewPropertiesParams, NewPropertiesResponse } from "@/types/newProperties";

export async function getNewProperties(params: NewPropertiesParams = {}): Promise<NewPropertiesResponse> {
  const response = await api.get<NewPropertiesResponse>(`${API_PREFIX}/new-properties`, { params });

  return response.data;
}
