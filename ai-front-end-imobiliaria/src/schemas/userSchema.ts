import { z } from "zod";

import {
    PASSWORD_MIN,
    optionalHttpUrl,
    requiredEmail,
    requiredPhoneBR,
    requiredText,
    username,
} from "@/schemas/commonFieldRules";

// =============================================================================
// Schema Zod — Formulário de Usuário
// =============================================================================

export const userFormSchema = z
    .object({
        // -- Dados Principais e Contato --
        name: requiredText("Nome").min(3, "Nome deve ter pelo menos 3 caracteres"),
        email: requiredEmail(),
        phone: requiredPhoneBR(),
        person_type: z.enum(["F", "J"], {
            message: "Tipo de pessoa é obrigatório",
        }),
        avatar: z.custom<File | null>().optional(),

        // -- Profissional --
        creci: z.string().trim().max(30, "CRECI deve ter no máximo 30 caracteres").optional().or(z.literal("")),
        order: z.coerce
            .number({ message: "Ordem é obrigatória" })
            .int("Ordem deve ser um número inteiro")
            .min(0, "Ordem deve ser positiva"),
        // No silent default: the group decides what the user can do.
        role_id: z.coerce
            .number({ message: "Selecione o grupo do usuário" })
            .int("Selecione o grupo do usuário")
            .positive("Selecione o grupo do usuário"),
        team_id: z.coerce.number().nullable().optional(),
        notes: z.string().optional().or(z.literal("")),

        // -- Visibilidade e Acesso --
        is_active: z.boolean().default(true),
        show_on_website: z.boolean().default(false),
        has_broker_page: z.boolean().default(false),

        // -- Credenciais --
        username: username(),
        password: z
            .string()
            .min(PASSWORD_MIN, `Senha deve ter pelo menos ${PASSWORD_MIN} caracteres`)
            .optional()
            .or(z.literal("")),
        password_confirmation: z.string().optional().or(z.literal("")),

        // -- Horários de Acesso --
        work_period_1_start: z.string().optional().or(z.literal("")),
        work_period_1_end: z.string().optional().or(z.literal("")),
        work_period_2_start: z.string().optional().or(z.literal("")),
        work_period_2_end: z.string().optional().or(z.literal("")),

        // -- Configurações para o Site --
        website_name: z.string().trim().max(255, "Nome no site deve ter no máximo 255 caracteres").optional().or(z.literal("")),
        facebook_link: optionalHttpUrl("Link do Facebook", 500),
        instagram_link: optionalHttpUrl("Link do Instagram", 500),
        description: z.string().optional().or(z.literal("")),
    })
    // Validação: senhas devem coincidir
    .refine(
        (data) => {
            if (data.password && data.password.length > 0) {
                return data.password === data.password_confirmation;
            }
            return true;
        },
        {
            message: "Senhas não conferem",
            path: ["password_confirmation"],
        }
    )
    // Validação: horário de saída deve ser após a entrada (1º período)
    .refine(
        (data) => {
            if (data.work_period_1_start && data.work_period_1_end) {
                return data.work_period_1_end > data.work_period_1_start;
            }
            return true;
        },
        {
            message: "Horário de saída deve ser após o horário de entrada",
            path: ["work_period_1_end"],
        }
    )
    // Validação: horário de saída deve ser após a entrada (2º período)
    .refine(
        (data) => {
            if (data.work_period_2_start && data.work_period_2_end) {
                return data.work_period_2_end > data.work_period_2_start;
            }
            return true;
        },
        {
            message: "Horário de saída deve ser após o horário de entrada",
            path: ["work_period_2_end"],
        }
    );

export type UserFormValues = z.infer<typeof userFormSchema>;
export type UserFormInput = z.input<typeof userFormSchema>;

// Schema para criação (senha obrigatória)
export const createUserSchema = userFormSchema.refine(
    (data) => {
        return Boolean(data.password && data.password.length >= PASSWORD_MIN);
    },
    {
        message: `Senha é obrigatória para novos usuários (mínimo ${PASSWORD_MIN} caracteres)`,
        path: ["password"],
    }
);
