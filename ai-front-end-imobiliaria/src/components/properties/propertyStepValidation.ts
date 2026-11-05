import type { z } from "zod";

import { crossFieldIssues, propertySchema, type PropertyFormValues } from "@/schemas/propertySchema";

export const STEP_VALUES = ["basic", "features", "values", "location", "media", "management"] as const;

export type PropertyStep = (typeof STEP_VALUES)[number];

export type PropertyFormInput = z.input<typeof propertySchema>;

type PropertyField = keyof PropertyFormValues;

export const STEP_LABELS: Record<PropertyStep, string> = {
    basic: "Dados Básicos",
    features: "Características",
    values: "Valores",
    location: "Localização",
    media: "Mídias",
    management: "Gestão Interna",
};

/** Which wizard step owns each schema field, so a schema issue can be traced to its step. */
const STEP_FIELDS: Record<PropertyStep, PropertyField[]> = {
    basic: ["reference_code", "title", "description", "property_type", "purpose", "status"],
    features: [
        "usable_area",
        "total_area",
        "build_year",
        "bedrooms",
        "suites",
        "bathrooms",
        "garage_spaces",
        "floor_number",
        "total_floors",
        "features",
    ],
    values: [
        "sale_price",
        "rent_price",
        "property_tax",
        "condo_fee",
        "accepts_financing",
        "accepts_exchange",
        "show_price",
    ],
    location: [
        "zip_code",
        "street",
        "number",
        "complement",
        "neighborhood",
        "city",
        "state",
        "latitude",
        "longitude",
        "show_exact_address",
    ],
    media: ["video_url", "virtual_tour_url"],
    management: [
        "broker_id",
        "owner_id",
        "is_published",
        "is_highlighted",
        "has_exclusive_right",
        "exclusive_right_expiration_date",
        "keys_location",
        "internal_notes",
    ],
};

/** The field labels shown on screen, used to tell the user what is still missing. */
const FIELD_LABELS: Partial<Record<PropertyField, string>> = {
    reference_code: "Código de Referência",
    title: "Título",
    description: "Descrição",
    property_type: "Tipo de Imóvel",
    purpose: "Finalidade",
    status: "Status",
    usable_area: "Área Útil",
    total_area: "Área Total",
    build_year: "Ano de Construção",
    bedrooms: "Quartos",
    suites: "Suítes",
    bathrooms: "Banheiros",
    garage_spaces: "Vagas",
    floor_number: "Andar",
    total_floors: "Total de Andares",
    sale_price: "Valor de Venda",
    rent_price: "Valor de Locação",
    property_tax: "IPTU",
    condo_fee: "Condomínio",
    zip_code: "CEP",
    street: "Logradouro",
    number: "Número",
    complement: "Complemento",
    neighborhood: "Bairro",
    city: "Cidade",
    state: "UF",
    latitude: "Latitude",
    longitude: "Longitude",
    video_url: "Vídeo do YouTube",
    virtual_tour_url: "Tour Virtual 360",
    broker_id: "Corretor Captador",
    owner_id: "Proprietário",
    exclusive_right_expiration_date: "Vencimento da Exclusividade",
    keys_location: "Localização das Chaves",
    internal_notes: "Notas Internas",
};

const STEP_BY_FIELD = new Map<string, PropertyStep>(
    STEP_VALUES.flatMap((step) => STEP_FIELDS[step].map((field) => [field, step] as const)),
);

export type StepIssues = Record<PropertyStep, string[]>;

/**
 * Runs the same schema the submit uses and groups the failing fields by step,
 * as the labels the user sees. A step is complete when its list is empty.
 */
export function issuesByStep(values: PropertyFormInput): StepIssues {
    const issues: StepIssues = { basic: [], features: [], values: [], location: [], media: [], management: [] };

    const add = (field: string) => {
        // Fields the wizard does not know about block the first step, so nothing slips through.
        const step = STEP_BY_FIELD.get(field) ?? "basic";
        const label = FIELD_LABELS[field as PropertyField] ?? field;
        if (!issues[step].includes(label)) issues[step].push(label);
    };

    const result = propertySchema.safeParse(values);
    if (!result.success) {
        for (const issue of result.error.issues) add(String(issue.path[0] ?? ""));
    }
    // Cross-field rules (price by purpose, areas, suites) are checked even when
    // other fields still fail, which can keep the schema from reaching them.
    for (const issue of crossFieldIssues(values)) add(issue.path);

    return issues;
}

/** True when every step before `target` is complete, i.e. the user may jump to it. */
export function canReachStep(issues: StepIssues, target: PropertyStep): boolean {
    const targetIndex = STEP_VALUES.indexOf(target);
    return STEP_VALUES.slice(0, targetIndex).every((step) => issues[step].length === 0);
}
