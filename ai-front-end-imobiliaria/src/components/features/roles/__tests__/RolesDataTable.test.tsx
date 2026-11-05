import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RolesDataTable } from '../RolesDataTable';
import type { Role } from '@/types/role';

function roles(count: number): Role[] {
    return Array.from({ length: count }, (_, index) => ({
        id: index + 1,
        name: `Grupo ${index + 1}`,
        permissions: [],
    }));
}

describe('RolesDataTable', () => {
    it('pages the groups ten at a time', () => {
        render(<RolesDataTable data={roles(12)} onDelete={vi.fn()} onEdit={vi.fn()} />);

        expect(screen.getByText('Grupo 10')).toBeInTheDocument();
        expect(screen.queryByText('Grupo 11')).not.toBeInTheDocument();
        expect(screen.getByText('1–10')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /próxima/i }));

        expect(screen.getByText('Grupo 11')).toBeInTheDocument();
        expect(screen.queryByText('Grupo 1')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page');
    });

    it('keeps the pagination footer when everything fits on one page', () => {
        render(<RolesDataTable data={roles(3)} onDelete={vi.fn()} onEdit={vi.fn()} />);

        expect(screen.getByText('1–3')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Página 1' })).toHaveAttribute('aria-current', 'page');
        expect(screen.getByRole('button', { name: /próxima/i })).toBeDisabled();
    });
});
