import { describe, it, expect } from 'vitest';
import { roleFormSchema } from '../roleSchema';

describe('Role Schema Validation', () => {
    it('deve falhar se o nome for vazio', () => {
        const result = roleFormSchema.safeParse({ name: '', permissions: [1] });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0].message).toBe('Nome do grupo é obrigatório');
        }
    });

    it('deve falhar se o array de permissões estiver vazio', () => {
        const result = roleFormSchema.safeParse({ name: 'Admin', permissions: [] });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0].message).toBe('Selecione pelo menos uma permissão');
        }
    });

    it('deve passar com dados válidos', () => {
        const result = roleFormSchema.safeParse({ name: 'Admin', permissions: [1, 2, 3] });
        expect(result.success).toBe(true);
    });
});
