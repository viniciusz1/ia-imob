import api, { API_PREFIX } from "./api";

import type {
  NewPropertyModuleInterest,
  RecordNewPropertyModuleInterestInput,
} from "@/types/newProperties";

interface NewPropertyModuleInterestResponse {
  data: NewPropertyModuleInterest | null;
}

export async function getNewPropertyModuleInterest(): Promise<NewPropertyModuleInterest | null> {
  const response = await api.get<NewPropertyModuleInterestResponse>(
    `${API_PREFIX}/new-properties/interest`,
  );

  return response.data.data;
}

export async function recordNewPropertyModuleInterest(
  input: RecordNewPropertyModuleInterestInput,
): Promise<NewPropertyModuleInterest> {
  const response = await api.put<{ data: NewPropertyModuleInterest }>(
    `${API_PREFIX}/new-properties/interest`,
    input,
  );

  return response.data.data;
}
