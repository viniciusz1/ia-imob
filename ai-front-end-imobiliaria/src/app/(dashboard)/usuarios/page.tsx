import { isAxiosError } from "axios";

import { getUsers } from "@/services/userService";
import { User, UserFiltersParams } from "@/types/user";
import { UsuariosClient } from "@/components/features/users/UsuariosClient";

export const dynamic = 'force-dynamic';

export const metadata = {
    title: "Gestão de Usuários",
};

interface PageProps {
    searchParams: Promise<{ [key: string]: string | undefined }>;
}

export default async function UsuariosPage({ searchParams }: PageProps) {
    const params = await searchParams;

    const filters: UserFiltersParams = {
        page: params.page ? Number(params.page) : 1,
        filterId: params.filterId,
        filterName: params.filterName,
        filterUsername: params.filterUsername,
        filterStatus: params.filterStatus,
        filterSite: params.filterSite,
        filterOnline: params.filterOnline,
    };

    let data: User[] = [];
    let meta: { last_page: number; total?: number } = { last_page: 1 };

    try {
        const response = await getUsers(filters);
        data = response.data;
        meta = response.meta;
    } catch (error: unknown) {
        console.error(
            "Erro ao buscar usuários (SSR):",
            error instanceof Error ? error.message : error,
            isAxiosError(error) ? error.response?.data : undefined
        );
    }

    return (
        <UsuariosClient
            initialData={data}
            pageCount={meta.last_page}
            total={meta.total}
        />
    );
}
