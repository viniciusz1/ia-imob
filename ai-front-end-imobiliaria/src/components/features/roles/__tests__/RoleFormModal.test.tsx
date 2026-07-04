import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoleFormModal } from '../RoleFormModal';
import { usePermissions, useCreateRole, useUpdateRole } from '@/hooks/useRoles';

// Mock os hooks customizados
vi.mock('@/hooks/useRoles', () => ({
    usePermissions: vi.fn(),
    useCreateRole: vi.fn(),
    useUpdateRole: vi.fn(),
}));

// Mock do UI components (ScrollArea tem problema no jsdom às vezes sem ResizeObserver)
vi.mock('@/components/ui/scroll-area', () => ({
    ScrollArea: ({ children }: any) => <div>{children}</div>
}));

describe('RoleFormModal', () => {
    const mockMutateAsync = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();

        (usePermissions as any).mockReturnValue({
            data: [
                { id: 1, name: 'users.create', label: 'Criar Usuários' },
                { id: 2, name: 'properties.edit', label: 'Editar Imóveis' },
            ],
            isLoading: false,
        });

        (useCreateRole as any).mockReturnValue({
            mutateAsync: mockMutateAsync,
            isPending: false,
        });

        (useUpdateRole as any).mockReturnValue({
            mutateAsync: vi.fn(),
            isPending: false,
        });
    });

    it('deve enviar as permissões selecionadas no payload de criação', async () => {
        render(<RoleFormModal open={true} onOpenChange={vi.fn()} initialData={null} />);

        // Preenche o nome
        const nameInput = screen.getByLabelText(/Nome do Grupo \*/i);
        fireEvent.change(nameInput, { target: { value: 'Gerentes' } });

        // Expande o grupo de permissões
        const groupTrigger = screen.getByRole('button', { name: /Usuários/i });
        fireEvent.click(groupTrigger);

        // Seleciona a primeira permissão
        const permissionCheckbox1 = screen.getByLabelText('Criar Usuários');
        fireEvent.click(permissionCheckbox1);

        // Submete
        const submitButton = screen.getByRole('button', { name: /Criar Grupo/i });
        fireEvent.click(submitButton);

        // O envio é assíncrono via react-hook-form
        await screen.findByRole('dialog');

        expect(mockMutateAsync).toHaveBeenCalledWith({
            name: 'Gerentes',
            permissions: [1],
        });
    });
});
