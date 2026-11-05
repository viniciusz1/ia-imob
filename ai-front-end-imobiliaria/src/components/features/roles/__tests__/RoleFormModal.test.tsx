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

describe('RoleFormModal', () => {
    const mockMutateAsync = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();

        vi.mocked(usePermissions).mockReturnValue({
            data: [
                { id: 1, name: 'users.create', label: 'Criar Usuários' },
                { id: 2, name: 'properties.edit', label: 'Editar Imóveis' },
            ],
            isLoading: false,
        } as unknown as ReturnType<typeof usePermissions>);

        vi.mocked(useCreateRole).mockReturnValue({
            mutateAsync: mockMutateAsync,
            isPending: false,
        } as unknown as ReturnType<typeof useCreateRole>);

        vi.mocked(useUpdateRole).mockReturnValue({
            mutateAsync: vi.fn(),
            isPending: false,
        } as unknown as ReturnType<typeof useUpdateRole>);
    });

    it('deve enviar as permissões selecionadas no payload de criação', async () => {
        render(<RoleFormModal open={true} onOpenChange={vi.fn()} initialData={null} />);

        // Preenche o nome
        const nameInput = screen.getByLabelText(/Nome do Grupo/i);
        fireEvent.change(nameInput, { target: { value: 'Gerentes' } });

        // As permissões aparecem agrupadas por módulo
        expect(screen.getByRole('group', { name: 'Usuários' })).toBeInTheDocument();

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

    it('mantém Criar Grupo desabilitado até informar o nome e uma permissão', () => {
        render(<RoleFormModal open={true} onOpenChange={vi.fn()} initialData={null} />);

        const submitButton = screen.getByRole('button', { name: /Criar Grupo/i });
        expect(submitButton).toBeDisabled();
        expect(screen.getByText('Preencha: Nome do grupo, Pelo menos uma permissão')).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText(/Nome do Grupo/i), { target: { value: 'Gerentes' } });
        expect(submitButton).toBeDisabled();
        expect(screen.getByText('Preencha: Pelo menos uma permissão')).toBeInTheDocument();

        fireEvent.click(screen.getByLabelText('Criar Usuários'));
        expect(submitButton).toBeEnabled();
    });

    it('mostra que o nome do grupo é obrigatório quando o campo é apagado', async () => {
        render(<RoleFormModal open={true} onOpenChange={vi.fn()} initialData={null} />);

        const nameInput = screen.getByLabelText(/Nome do Grupo/i);
        fireEvent.change(nameInput, { target: { value: 'G' } });
        fireEvent.change(nameInput, { target: { value: '   ' } });

        expect(await screen.findByText('Nome do grupo é obrigatório')).toBeInTheDocument();
        expect(nameInput).toHaveAttribute('aria-invalid', 'true');
    });
});
