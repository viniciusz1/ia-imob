import api from "./api";
import type {
    User,
    UserFiltersParams,
    UserFormData,
    PaginatedResponse,
} from "@/types/user";

// =============================================================================
// Serviço de Usuários — Chamadas HTTP à API Laravel
// =============================================================================

const BASE_PATH = "/api/users";

/**
 * Lista usuários com filtros e paginação server-side.
 */
export async function getUsers(
    params: UserFiltersParams
): Promise<PaginatedResponse<User>> {
    const queryParams: Record<string, string> = {};

    if (params.page) queryParams.page = String(params.page);
    if (params.filterId) queryParams.id = params.filterId;
    if (params.filterName) queryParams.name = params.filterName;
    if (params.filterUsername) queryParams.username = params.filterUsername;
    if (params.filterTeam) queryParams.team_id = params.filterTeam;
    if (params.filterStatus) queryParams.is_active = params.filterStatus;
    if (params.filterSite) queryParams.show_on_website = params.filterSite;
    if (params.filterOnline) queryParams.is_online = params.filterOnline;

    const { data } = await api.get<PaginatedResponse<User>>(BASE_PATH, {
        params: queryParams,
    });

    return data;
}

/**
 * Busca um usuário pelo ID.
 */
export async function getUserById(id: number): Promise<User> {
    const { data } = await api.get<{ data: User }>(`${BASE_PATH}/${id}`);
    return data.data;
}

/**
 * Cria um novo usuário. Utiliza FormData para suportar upload de avatar.
 */
export async function createUser(userData: UserFormData): Promise<User> {
    const formData = buildFormData(userData);

    const { data } = await api.post<{ data: User }>(BASE_PATH, formData);

    return data.data;
}

/**
 * Atualiza um usuário existente. Utiliza FormData para suportar upload de avatar.
 * Usa POST com _method=PUT para compatibilidade com FormData no Laravel.
 */
export async function updateUser(
    id: number,
    userData: UserFormData
): Promise<User> {
    const formData = buildFormData(userData);
    formData.append("_method", "PUT");

    const { data } = await api.post<{ data: User }>(
        `${BASE_PATH}/${id}`,
        formData
    );

    return data.data;
}

/**
 * Exclui um usuário pelo ID.
 */
export async function deleteUser(id: number): Promise<void> {
    await api.delete(`${BASE_PATH}/${id}`);
}

// =============================================================================
// Helpers
// =============================================================================

function buildFormData(userData: UserFormData): FormData {
    const formData = new FormData();

    // Campos obrigatórios string
    formData.append("name", userData.name);
    formData.append("email", userData.email);
    formData.append("phone", userData.phone);
    formData.append("person_type", userData.person_type);
    formData.append("username", userData.username);

    // Campos numéricos obrigatórios (converter para string)
    formData.append("order", String(userData.order));
    formData.append("role_id", String(userData.role_id));

    // Booleanos: enviar "1" (true) ou "0" (false) sempre
    formData.append("is_active", userData.is_active ? "1" : "0");
    formData.append("show_on_website", userData.show_on_website ? "1" : "0");
    formData.append("has_broker_page", userData.has_broker_page ? "1" : "0");

    // File
    if (userData.avatar instanceof File) {
        formData.append("avatar", userData.avatar);
    }

    // Opcionais: só anexar se tiverem valor (não vazio e não null)
    if (userData.creci) formData.append("creci", userData.creci);
    if (userData.team_id != null)
        formData.append("team_id", String(userData.team_id));
    if (userData.notes) formData.append("notes", userData.notes);
    if (userData.password) formData.append("password", userData.password);
    if (userData.password_confirmation)
        formData.append("password_confirmation", userData.password_confirmation);

    if (userData.work_period_1_start)
        formData.append("work_period_1_start", userData.work_period_1_start);
    if (userData.work_period_1_end)
        formData.append("work_period_1_end", userData.work_period_1_end);

    if (userData.work_period_2_start)
        formData.append("work_period_2_start", userData.work_period_2_start);
    if (userData.work_period_2_end)
        formData.append("work_period_2_end", userData.work_period_2_end);

    if (userData.website_name)
        formData.append("website_name", userData.website_name);

    if (userData.facebook_link)
        formData.append("facebook_link", userData.facebook_link);

    if (userData.instagram_link)
        formData.append("instagram_link", userData.instagram_link);

    if (userData.description)
        formData.append("description", userData.description);

    return formData;
}
