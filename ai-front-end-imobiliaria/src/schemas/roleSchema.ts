import { z } from "zod";

// =============================================================================
// Schema Zod — Formulário de Grupos de Usuários (Roles)
// =============================================================================

export const roleFormSchema = z.object({
    name: z
        .string({ message: "Nome do grupo é obrigatório" })
        .min(1, "Nome do grupo é obrigatório")
        .max(255, "Nome do grupo deve ter no máximo 255 caracteres"),
    permissions: z
        .array(z.number())
        .min(1, { message: "Selecione pelo menos uma permissão" }),
});

export type RoleFormValues = z.infer<typeof roleFormSchema>;
