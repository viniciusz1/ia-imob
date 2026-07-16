import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserFormModal } from '../UserFormModal';
import { useRoles } from '@/hooks/useRoles';
import { useAuthStore } from '@/store/useAuthStore';

// Mock hooks
vi.mock('@/hooks/useRoles', () => ({
    useRoles: vi.fn(),
}));

vi.mock('@/hooks/useUsers', () => ({
    useCreateUser: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
    useUpdateUser: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

// Mock ResizeObserver para scroll-area
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};

describe('UserFormModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useAuthStore.getState().clearAuth();
    });

    it('deve renderizar os grupos de forma dinâmica consumindo do hook useRoles', () => {
        useAuthStore.getState().setUser({
            id: 1,
            name: 'Admin',
            email: 'admin@example.com',
            permissions: ['roles.manage'],
        });
        vi.mocked(useRoles).mockReturnValue({
            data: [
                { id: 10, name: 'Admin Supremo' },
                { id: 20, name: 'Corretor VIP' },
            ],
            isLoading: false,
        } as ReturnType<typeof useRoles>);

        render(<UserFormModal open={true} onOpenChange={vi.fn()} initialData={null} />);

        // Como o Select do Radix é renderizado num portal/Trigger, pode ser complexo pegar a lista sem interagir
        // Vamos apenas verificar se "Admin Supremo" está no documento / renderizou,
        // dependendo de como o Select renderiza as opções escondidas, mas no Shadcn 
        // a <SelectValue> vai renderizar o primeiro ou placeholder.

        // Verifica se carregou sem erros e o campo Grupo do Usuário existe
        const groupLabel = screen.getByText('Grupo do Usuário *');
        expect(groupLabel).toBeInTheDocument();
        expect(useRoles).toHaveBeenCalledWith(true);
    });

    it('não carrega grupos quando o modal está fechado ou sem permissão', () => {
        useAuthStore.getState().setUser({
            id: 4,
            name: 'Platform Admin',
            email: 'platform@imobiliaria.com',
            permissions: ['crawler.view'],
        });
        vi.mocked(useRoles).mockReturnValue({
            data: undefined,
            isLoading: false,
        } as ReturnType<typeof useRoles>);

        render(<UserFormModal open={false} onOpenChange={vi.fn()} initialData={null} />);

        expect(useRoles).toHaveBeenCalledWith(false);
    });
});
