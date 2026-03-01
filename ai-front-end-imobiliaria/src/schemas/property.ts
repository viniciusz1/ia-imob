import { z } from "zod";

export const propertySchema = z.object({
    reference_code: z.string().min(1, "Código de referência é obrigatório"),
    title: z.string().min(5, "Título muito curto"),
    description: z.string().nullable(),
    property_type: z.string().min(1, "Selecione o tipo de imóvel"),
    purpose: z.string().min(1, "Selecione a finalidade"),
    status: z.string().min(1, "Selecione o status do imóvel"),

    usable_area: z.number().min(0).nullable(),
    total_area: z.number().min(0).nullable(),
    bedrooms: z.number().int().min(0),
    suites: z.number().int().min(0),
    bathrooms: z.number().int().min(0),
    garage_spaces: z.number().int().min(0),
    floor_number: z.number().int().nullable(),
    total_floors: z.number().int().nullable(),
    build_year: z.number().int().min(1800).max(new Date().getFullYear() + 10).nullable(),

    features: z.array(z.number().int()).default([]),

    sale_price: z.number().min(0).nullable(),
    rent_price: z.number().min(0).nullable(),
    property_tax: z.number().min(0).nullable(),
    condo_fee: z.number().min(0).nullable(),
    accepts_financing: z.boolean().default(false),
    accepts_exchange: z.boolean().default(false),
    show_price: z.boolean().default(true),

    zip_code: z.string().min(8, "CEP é obrigatório"),
    street: z.string().min(1, "Logradouro é obrigatório"),
    number: z.string().min(1, "Número é obrigatório"),
    complement: z.string().nullable(),
    neighborhood: z.string().min(1, "Bairro é obrigatório"),
    city: z.string().min(1, "Cidade é obrigatória"),
    state: z.string().min(2, "UF é obrigatória"),
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
    show_exact_address: z.boolean().default(false),

    video_url: z.union([z.string().url("URL inválida"), z.literal(""), z.null()]),
    virtual_tour_url: z.union([z.string().url("URL inválida"), z.literal(""), z.null()]),

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
            message: "Data de expiração é obrigatória quando há exclusividade.",
            path: ["exclusive_right_expiration_date"],
        });
    }
});

export type PropertyFormValues = z.infer<typeof propertySchema>;
