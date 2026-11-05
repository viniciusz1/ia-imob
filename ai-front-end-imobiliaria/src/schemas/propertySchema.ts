import { z } from "zod";

function parseDateAtLocalMidnight(value: string): Date | null {
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
}

function getTodayAtLocalMidnight(): Date {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

/** Newest construction year accepted: up to ten years ahead, for off-plan buildings (same rule as the API). */
export const BUILD_YEAR_MAX = new Date().getFullYear() + 10;

/** Largest area accepted, in m² (big plots and warehouses included). */
export const AREA_MAX = 1_000_000;

/** Counts the user must inform explicitly; empty (null) is not accepted. */
function requiredCount(label: string, max: number) {
    return z
        .number()
        .int("Informe um número inteiro")
        .min(0, "Não pode ser negativo")
        .max(max, `No máximo ${max}`)
        .nullable()
        .refine((value) => value !== null, { message: `Informe ${label}` });
}

/** Purposes that put the property up for sale / for rent. */
const SALE_PURPOSES = new Set(["venda", "venda_locacao"]);
const RENT_PURPOSES = new Set(["locacao", "venda_locacao"]);

interface CrossFieldValues {
    purpose?: string | null;
    sale_price?: number | null;
    rent_price?: number | null;
    usable_area?: number | null;
    total_area?: number | null;
    bedrooms?: number | null;
    suites?: number | null;
}

export interface CrossFieldIssue {
    path: "sale_price" | "rent_price" | "total_area" | "suites";
    message: string;
}

/**
 * Rules that depend on more than one field. They run inside the schema and
 * also on their own (the wizard calls them directly), so a missing price is
 * reported even while another field of the form is still invalid.
 */
export function crossFieldIssues(values: CrossFieldValues): CrossFieldIssue[] {
    const issues: CrossFieldIssue[] = [];
    const purpose = values.purpose ?? "";

    if (SALE_PURPOSES.has(purpose) && !(typeof values.sale_price === "number" && values.sale_price > 0)) {
        issues.push({ path: "sale_price", message: "Informe o valor de venda" });
    }
    if (RENT_PURPOSES.has(purpose) && !(typeof values.rent_price === "number" && values.rent_price > 0)) {
        issues.push({ path: "rent_price", message: "Informe o valor de locação" });
    }
    if (
        typeof values.total_area === "number" &&
        typeof values.usable_area === "number" &&
        values.total_area < values.usable_area
    ) {
        issues.push({ path: "total_area", message: "A área total não pode ser menor que a área útil" });
    }
    if (
        typeof values.suites === "number" &&
        typeof values.bedrooms === "number" &&
        values.suites > values.bedrooms
    ) {
        issues.push({ path: "suites", message: "Suítes não podem passar do número de quartos" });
    }

    return issues;
}

export const propertySchema = z.object({
    reference_code: z.string().min(1, "Codigo de referencia e obrigatorio"),
    title: z.string().min(5, "Titulo muito curto"),
    description: z.string().nullable(),
    property_type: z.string().min(1, "Selecione o tipo de imovel"),
    purpose: z.string().min(1, "Selecione a finalidade"),
    status: z.string().min(1, "Selecione o status do imovel"),

    usable_area: z
        .number()
        .positive("A área útil deve ser maior que zero")
        .max(AREA_MAX, "Área acima do limite de 1.000.000 m²")
        .nullable()
        .refine((value) => value !== null, { message: "Informe a área útil" }),
    total_area: z
        .number()
        .positive("A área total deve ser maior que zero")
        .max(AREA_MAX, "Área acima do limite de 1.000.000 m²")
        .nullable(),
    bedrooms: requiredCount("a quantidade de quartos", 99),
    suites: z.number().int("Informe um número inteiro").min(0, "Não pode ser negativo").max(99, "No máximo 99"),
    bathrooms: requiredCount("a quantidade de banheiros", 99),
    garage_spaces: requiredCount("a quantidade de vagas", 999),
    floor_number: z.number().int().min(-10, "Andar mínimo é -10").max(300, "Andar máximo é 300").nullable(),
    total_floors: z.number().int().min(0, "Não pode ser negativo").max(300, "No máximo 300 andares").nullable(),
    build_year: z
        .number()
        .int()
        .min(1800, "Informe um ano a partir de 1800")
        .max(BUILD_YEAR_MAX, `Informe um ano até ${BUILD_YEAR_MAX}`)
        .nullable(),

    features: z.array(z.number().int()).default([]),

    sale_price: z.number().min(0, "Não pode ser negativo").nullable(),
    rent_price: z.number().min(0, "Não pode ser negativo").nullable(),
    property_tax: z.number().min(0, "Não pode ser negativo").nullable(),
    condo_fee: z.number().min(0, "Não pode ser negativo").nullable(),
    accepts_financing: z.boolean().default(false),
    accepts_exchange: z.boolean().default(false),
    show_price: z.boolean().default(true),

    zip_code: z
        .string()
        .min(1, "CEP é obrigatório")
        .refine((value) => value.replace(/\D/g, "").length === 8, { message: "O CEP precisa de 8 dígitos" }),
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
    for (const issue of crossFieldIssues(data)) {
        ctx.addIssue({ code: "custom", message: issue.message, path: [issue.path] });
    }

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
