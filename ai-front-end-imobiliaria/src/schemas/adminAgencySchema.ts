import { z } from "zod";

export const agencyFormSchema = z.object({
    name: z
        .string({ message: "Nome da agência é obrigatório" })
        .min(1, "Nome da agência é obrigatório")
        .max(255, "Nome da agência deve ter no máximo 255 caracteres"),
    slug: z
        .string({ message: "Slug é obrigatório" })
        .min(1, "Slug é obrigatório")
        .max(255, "Slug deve ter no máximo 255 caracteres")
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
});

export type AgencyFormValues = z.infer<typeof agencyFormSchema>;

export const registerAgencySchema = z
    .object({
        agencyName: z
            .string({ message: "Nome da agência é obrigatório" })
            .min(1, "Nome da agência é obrigatório")
            .max(255, "Nome da agência deve ter no máximo 255 caracteres"),
        agencySlug: z
            .string({ message: "Slug é obrigatório" })
            .min(1, "Slug é obrigatório")
            .max(255, "Slug deve ter no máximo 255 caracteres")
            .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
        agencyPhone: z.string().max(30, "Telefone deve ter no máximo 30 caracteres").optional(),
        agencyEmail: z.string().email("E-mail inválido").max(255).optional().or(z.literal("")),
        adminName: z
            .string({ message: "Nome do administrador é obrigatório" })
            .min(1, "Nome do administrador é obrigatório")
            .max(255),
        adminEmail: z.string({ message: "E-mail do administrador é obrigatório" }).email("E-mail inválido"),
        adminUsername: z
            .string({ message: "Usuário é obrigatório" })
            .min(1, "Usuário é obrigatório")
            .max(255),
        adminPhone: z.string().max(30).optional(),
        adminPassword: z
            .string({ message: "Senha é obrigatória" })
            .min(8, "Senha deve ter no mínimo 8 caracteres"),
        adminPasswordConfirmation: z.string().optional(),
    })
    .refine((data) => data.adminPassword === data.adminPasswordConfirmation, {
        message: "As senhas não conferem.",
        path: ["adminPasswordConfirmation"],
    });

export type RegisterAgencyFormValues = z.infer<typeof registerAgencySchema>;
