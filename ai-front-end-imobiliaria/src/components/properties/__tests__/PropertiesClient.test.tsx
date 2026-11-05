import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PropertiesClient } from '../PropertiesClient';
import type { Property } from '@/types/property';

const push = vi.fn();

vi.mock('next/navigation', () => ({
    usePathname: () => '/properties',
    useRouter: () => ({ push, refresh: vi.fn() }),
    useSearchParams: () => new URLSearchParams('status=disponivel'),
}));

const mutateAsync = vi.fn();

vi.mock('@/hooks/useProperties', () => ({
    useDeleteProperty: () => ({ isPending: false, mutateAsync }),
}));

function property(id: number): Property {
    return {
        id,
        reference_code: `REF-${id}`,
        title: `Imóvel ${id}`,
        status: 'disponivel',
        property_type: 'casa',
        city: 'Joinville',
        neighborhood: 'Centro',
        is_published: true,
        is_highlighted: false,
        sale_price: 500000,
        rent_price: null,
    } as Property;
}

describe('PropertiesClient', () => {
    beforeEach(() => {
        push.mockReset();
        mutateAsync.mockReset();
    });

    it('opens the property when any part of the row is clicked', () => {
        render(<PropertiesClient initialData={[property(7)]} page={1} pageCount={1} pageSize={10} total={1} />);

        fireEvent.click(screen.getByText('Joinville'));

        expect(push).toHaveBeenCalledWith('/properties/7/edit');
    });

    it('asks for confirmation in a dialog before deleting', () => {
        render(<PropertiesClient initialData={[property(7)]} page={1} pageCount={1} pageSize={10} total={1} />);

        fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));

        expect(push).not.toHaveBeenCalled();
        expect(screen.getByRole('alertdialog')).toHaveTextContent('O imóvel "Imóvel 7" será excluído.');

        fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

        expect(mutateAsync).not.toHaveBeenCalled();
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    it('shows the API page summary and navigates through the URL', () => {
        render(
            <PropertiesClient
                initialData={[property(1), property(2)]}
                page={1}
                pageCount={3}
                pageSize={10}
                total={22}
            />,
        );

        expect(screen.getByText('1–10')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Página 1' })).toHaveAttribute('aria-current', 'page');

        fireEvent.click(screen.getByRole('button', { name: /próxima/i }));

        expect(push).toHaveBeenCalledWith('/properties?status=disponivel&page=2');
    });

    it('keeps the pagination footer below the empty state', () => {
        render(<PropertiesClient initialData={[]} page={1} pageCount={1} pageSize={10} total={0} />);

        expect(screen.getByText('Nenhum imóvel cadastrado.')).toBeInTheDocument();
        expect(screen.getByText('0–0')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /próxima/i })).toBeDisabled();
    });
});
