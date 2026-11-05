import { z } from "zod";

function parseDateAtLocalMidnight(value: string): Date | null {
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
}

function getTodayAtLocalMidnight(): Date {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

/** Newest construction year accepted (buildings launched up to five years ahead). */
export const BUILD_YEAR_MAX = new Date().getFullYear() + 5;

export const propertySchema = z.object({
    reference_code: z.string().min(1, "Codigo de referencia e obrigatorio"),
    title: z.string().min(5, "Titulo muito curto"),
    description: z.string().nullable(),
    property_type: z.string().min(1, "Selecione o tipo de imovel"),
    purpose: z.string().min(1, "Selecione a finalidade"),
    status: z.string().min(1, "Selecione o status do imovel"),

    usable_area: z.number().min(0, "Área não pode ser negativa").max(1_000_000, "Área acima do limite").nullable(),
    total_area: z.number().min(0, "Área não pode ser negativa").max(10_000_000, "Área acima do limite").nullable(),
    bedrooms: z.number().int().min(0).max(99, "No máximo 99"),
    suites: z.number().int().min(0).max(99, "No máximo 99"),
    bathrooms: z.number().int().min(0).max(99, "No máximo 99"),
    garage_spaces: z.number().int().min(0).max(999, "No máximo 999"),
    floor_number: z.number().int().min(-10, "Andar mínimo é -10").max(300, "Andar máximo é 300").nullable(),
    total_floors: z.number().int().min(0, "Não pode ser negativo").max(300, "No máximo 300 andares").nullable(),
    build_year: z
        .number()
        .int()
        .min(1800, "Informe um ano a partir de 1800")
        .max(BUILD_YEAR_MAX, `Informe um ano até ${BUILD_YEAR_MAX}`)
        .nullable(),

    features: z.array(z.number().int()).default([]),

    sale_price: z.number().min(0).nullable(),
    rent_price: z.number().min(0).nullable(),
    property_tax: z.number().min(0).nullable(),
    condo_fee: z.number().min(0).nullable(),
    accepts_financing: z.boolean().default(false),
    accepts_exchange: z.boolean().default(false),
    show_price: z.boolean().default(true),

    zip_code: z.string().min(8, "CEP e obrigatorio"),
    street: z.string().min(1, "Logradouro e obrigatorio"),
    number: z.string().min(1, "Numero e obrigatorio"),
    complement: z.string().nullable(),
    neighborhood: z.string().min(1, "Bairro e obrigatorio"),
    city: z.string().min(1, "Cidade e obrigatoria"),
    state: z.string().min(2, "UF e obrigatoria"),
    latitude: z.number().min(-90, "Latitude entre -90 e 90").max(90, "Latitude entre -90 e 90").nullable(),
    longitude: z.number().min(-180, "Longitude entre -180 e 180").max(180, "Longitude entre -180 e 180").nullable(),
    show_exact_address: z.boolean().default(false),

    video_url: z.union([z.string().url("URL invalida"), z.literal(""), z.null()]),
    virtual_tour_url: z.union([z.string().url("URL invalida"), z.literal(""), z.null()]),

    broker_id: z.number().int().nullable(),
    owner_id: z.number().int().nullable(),
    is_published: z.boolean().default(false),
    is_highlighted: z.boolean().default(false),
    has_exclusive_right: z.boolean().default(false),
    exclusive_right_expiration_date: z.string().nullable(),
    keys_location: z.string().nullable(),
    internal_notes: z.string().nullable(),
}).superRefine((data, ctx) => {
    if (data.has_exclusive_right && !data.exclusive_right_expiration_date) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Data de expiracao e obrigatoria quando ha exclusividade.",
            path: ["exclusive_right_expiration_date"],
        });
    }

    if (data.exclusive_right_expiration_date) {
        const parsedDate = parseDateAtLocalMidnight(data.exclusive_right_expiration_date);
        const today = getTodayAtLocalMidnight();

        if (!parsedDate) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Data de expiracao invalida.",
                path: ["exclusive_right_expiration_date"],
            });
            return;
        }

        if (parsedDate < today) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Data de expiracao deve ser hoje ou uma data futura.",
                path: ["exclusive_right_expiration_date"],
            });
        }
    }
});

export type PropertyFormValues = z.infer<typeof propertySchema>;
