// =============================================================================
// Tipos do Módulo de Gestão de Grupos de Usuários (Roles) e Permissões
// =============================================================================

export interface Permission {
    id: number;
    name: string;
    label?: string;
}

export interface Role {
    id: number;
    name: string;
    created_at?: string;
    permissions: Permission[];
}

export interface RoleFormData {
    name: string;
    permissions: number[]; // array of permission IDs
}

export interface PaginatedRolesResponse {
    data: Role[];
    meta: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from: number | null;
        to: number | null;
    };
    links: {
        first: string | null;
        last: string | null;
        prev: string | null;
        next: string | null;
    };
}
