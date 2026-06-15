import api, { API_PREFIX } from "./api";

const BASE = `${API_PREFIX}/admin`;

export interface AgencySummary {
    id: number;
    name: string;
    slug: string;
    is_active: boolean;
    owner_user_id: number | null;
    created_at: string | null;
    updated_at: string | null;
}

export interface RegisterAgencyPayload {
    agency: {
        name: string;
        slug: string;
        phone?: string;
        email?: string;
        document?: string;
    };
    admin: {
        name: string;
        email: string;
        username: string;
        phone?: string;
        password: string;
        password_confirmation: string;
    };
}

export async function listAgencies(): Promise<AgencySummary[]> {
    const { data } = await api.get<{ data: AgencySummary[] }>(`${BASE}/agencies`);
    return data.data;
}

export async function getAgency(id: number): Promise<AgencySummary> {
    const { data } = await api.get<{ data: AgencySummary }>(`${BASE}/agencies/${id}`);
    return data.data;
}

export async function createAgency(payload: RegisterAgencyPayload): Promise<AgencySummary> {
    const { data } = await api.post<{ data: AgencySummary }>(`${BASE}/agencies`, payload);
    return data.data;
}

export interface AgencyUpdatePayload {
    name: string;
    slug: string;
    phone?: string;
    email?: string;
}

export async function updateAgency(id: number, payload: AgencyUpdatePayload): Promise<AgencySummary> {
    const { data } = await api.put<{ data: AgencySummary }>(`${BASE}/agencies/${id}`, payload);
    return data.data;
}

export async function activateAgency(id: number): Promise<AgencySummary> {
    const { data } = await api.post<{ data: AgencySummary }>(`${BASE}/agencies/${id}/activate`);
    return data.data;
}

export async function deactivateAgency(id: number): Promise<AgencySummary> {
    const { data } = await api.post<{ data: AgencySummary }>(`${BASE}/agencies/${id}/deactivate`);
    return data.data;
}
