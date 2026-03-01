// =============================================================================
// Tipos do Módulo de Gestão de Usuários
// =============================================================================

export type PersonType = "F" | "J";

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  creci: string | null;
  order: number;
  group_id: number;
  team_id: number | null;
  notes: string | null;
  is_active: boolean;
  show_on_website: boolean;
  has_broker_page: boolean;
  person_type: PersonType;
  username: string;
  avatar_path: string | null;
  avatar_url: string | null;
  work_period_1_start: string | null;
  work_period_1_end: string | null;
  work_period_2_start: string | null;
  work_period_2_end: string | null;
  website_name: string | null;
  facebook_link: string | null;
  instagram_link: string | null;
  description: string | null;
  last_seen_at: string | null;
  is_online: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserFiltersParams {
  page?: number;
  filterId?: string;
  filterName?: string;
  filterUsername?: string;
  filterTeam?: string;
  filterStatus?: string;
  filterSite?: string;
  filterOnline?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
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

export interface UserFormData {
  name: string;
  email: string;
  phone: string;
  person_type: PersonType;
  avatar?: File | null;
  creci?: string;
  order: number;
  group_id: number;
  team_id?: number | null;
  notes?: string;
  is_active: boolean;
  show_on_website: boolean;
  has_broker_page: boolean;
  username: string;
  password?: string;
  password_confirmation?: string;
  work_period_1_start?: string;
  work_period_1_end?: string;
  work_period_2_start?: string;
  work_period_2_end?: string;
  website_name?: string;
  facebook_link?: string;
  instagram_link?: string;
  description?: string;
}

export interface SelectOption {
  value: string;
  label: string;
}
