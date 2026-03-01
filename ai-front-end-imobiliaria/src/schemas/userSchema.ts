import { z } from "zod";

// =============================================================================
// Schema Zod — Formulário de Usuário
// =============================================================================

export const userFormSchema = z
    .object({
        // -- Dados Principais e Contato --
        name: z
            .string({ message: "Nome é obrigatório" })
            .min(3, "Nome deve ter pelo menos 3 caracteres"),
        email: z
            .string({ message: "Email é obrigatório" })
            .email("Email inválido"),
        phone: z
            .string({ message: "Telefone é obrigatório" })
            .min(10, "Telefone deve ter pelo menos 10 caracteres"),
        person_type: z.enum(["F", "J"], {
            message: "Tipo de pessoa é obrigatório",
        }),
        avatar: z.any().optional(),

        // -- Profissional --
        creci: z.string().optional().or(z.literal("")),
        order: z.coerce
            .number({ message: "Ordem é obrigatória" })
            .int("Ordem deve ser um número inteiro")
            .min(0, "Ordem deve ser positiva"),
        role_id: z.coerce.number({
            message: "Grupo é obrigatório",
        }),
        team_id: z.coerce.number().nullable().optional(),
        notes: z.string().optional().or(z.literal("")),

        // -- Visibilidade e Acesso --
        is_active: z.boolean().default(true),
        show_on_website: z.boolean().default(false),
        has_broker_page: z.boolean().default(false),

        // -- Credenciais --
        username: z
            .string({ message: "Usuário é obrigatório" })
            .min(3, "Usuário deve ter pelo menos 3 caracteres"),
        password: z
            .string()
            .min(8, "Senha deve ter pelo menos 8 caracteres")
            .optional()
            .or(z.literal("")),
        password_confirmation: z.string().optional().or(z.literal("")),

        // -- Horários de Acesso --
        work_period_1_start: z.string().optional().or(z.literal("")),
        work_period_1_end: z.string().optional().or(z.literal("")),
        work_period_2_start: z.string().optional().or(z.literal("")),
        work_period_2_end: z.string().optional().or(z.literal("")),

        // -- Configurações para o Site --
        website_name: z.string().optional().or(z.literal("")),
        facebook_link: z
            .string()
            .url("Link do Facebook deve ser uma URL válida")
            .optional()
            .or(z.literal("")),
        instagram_link: z
            .string()
            .url("Link do Instagram deve ser uma URL válida")
            .optional()
            .or(z.literal("")),
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

// Schema para criação (senha obrigatória)
export const createUserSchema = userFormSchema.refine(
    (data) => {
        return data.password && data.password.length >= 8;
    },
    {
        message: "Senha é obrigatória para novos usuários (mínimo 8 caracteres)",
        path: ["password"],
    }
);
