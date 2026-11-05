import { z } from "zod";

import {
    PASSWORD_MIN,
    optionalEmail,
    optionalPhoneBR,
    requiredEmail,
    requiredText,
    username,
} from "@/schemas/commonFieldRules";

const slugRule = z
    .string({ message: "Slug é obrigatório" })
    .trim()
    .min(1, "Slug é obrigatório")
    .max(255, "Slug deve ter no máximo 255 caracteres")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug deve conter apenas letras minúsculas, números e hífens");

export const agencyFormSchema = z.object({
    name: requiredText("Nome da agência"),
    slug: slugRule,
});

export type AgencyFormValues = z.infer<typeof agencyFormSchema>;

export const registerAgencySchema = z
    .object({
        agencyName: requiredText("Nome da agência"),
        agencySlug: slugRule,
        agencyPhone: optionalPhoneBR(),
        agencyEmail: optionalEmail(),
        adminName: requiredText("Nome do administrador"),
        adminEmail: requiredEmail("E-mail do administrador"),
        adminUsername: username(255),
        adminPhone: optionalPhoneBR(),
        adminPassword: z
            .string({ message: "Senha é obrigatória" })
            .min(1, "Senha é obrigatória")
            .min(PASSWORD_MIN, `Senha deve ter no mínimo ${PASSWORD_MIN} caracteres`),
        adminPasswordConfirmation: z.string().optional(),
    })
    .refine((data) => data.adminPassword === data.adminPasswordConfirmation, {
        message: "As senhas não conferem.",
        path: ["adminPasswordConfirmation"],
    });

export type RegisterAgencyFormValues = z.infer<typeof registerAgencySchema>;
