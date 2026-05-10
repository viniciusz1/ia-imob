import api, { API_PREFIX } from "./api";
import type { Role, Permission, RoleFormData, PaginatedRolesResponse } from "@/types/role";

// =============================================================================
// Serviço de Grupos de Usuários (Roles) — API Laravel
// =============================================================================

const BASE_PATH = `${API_PREFIX}/roles`;
const PERM_PATH = `${API_PREFIX}/permissions`;

/**
 * Busca todas as roles disponíveis (sem paginação, para selects)
 * Dependendo da sua API, você pode querer manter ou não paginação.
 */
export async function getRoles(): Promise<Role[]> {
    const { data } = await api.get<{ data: Role[] }>(BASE_PATH);
    return data.data;
}

/**
 * Busca listagem paginada de roles para o DataTable.
 */
export async function getPaginatedRoles(page: number = 1): Promise<PaginatedRolesResponse> {
    const { data } = await api.get<PaginatedRolesResponse>(BASE_PATH, {
        params: { page },
    });
    return data;
}

/**
 * Busca uma role específica pelo ID.
 */
export async function getRoleById(id: number): Promise<Role> {
    const { data } = await api.get<{ data: Role }>(`${BASE_PATH}/${id}`);
    return data.data;
}

/**
 * Cria uma nova role.
 */
export async function createRole(roleData: RoleFormData): Promise<Role> {
    const { data } = await api.post<{ data: Role }>(BASE_PATH, roleData);
    return data.data;
}

/**
 * Atualiza uma role existente.
 */
export async function updateRole(id: number, roleData: RoleFormData): Promise<Role> {
    const { data } = await api.put<{ data: Role }>(`${BASE_PATH}/${id}`, roleData);
    return data.data;
}

/**
 * Exclui uma role pelo ID.
 */
export async function deleteRole(id: number): Promise<void> {
    await api.delete(`${BASE_PATH}/${id}`);
}

/**
 * Busca todas as permissões para exibir no formulário de criação/edição.
 */
export async function getPermissions(): Promise<Permission[]> {
    const { data } = await api.get<{ data: Permission[] }>(PERM_PATH);
    return data.data;
}
