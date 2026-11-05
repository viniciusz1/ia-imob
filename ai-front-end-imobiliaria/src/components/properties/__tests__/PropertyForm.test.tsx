import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PropertyForm } from "../PropertyForm";
import type { Property } from "@/types/property";

const mocks = vi.hoisted(() => ({
    push: vi.fn(),
    refresh: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("@/hooks/useSystemEnums", () => ({
    useSystemEnums: () => ({
        data: [
            { tag: "property_types", data: [{ value: "house", label: "Casa" }] },
            { tag: "property_purposes", data: [{ value: "sale", label: "Venda" }] },
            { tag: "property_statuses", data: [{ value: "available", label: "Disponível" }] },
        ],
        isLoading: false,
    }),
}));

vi.mock("@/hooks/useProperties", () => ({
    useGetFeatures: () => ({ data: [], isLoading: false }),
    useCreateProperty: () => ({ mutateAsync: mocks.create, isPending: false }),
    useUpdateProperty: () => ({ mutateAsync: mocks.update, isPending: false }),
}));

vi.mock("@/services/propertyService", () => ({
    deletePropertyImage: vi.fn(),
    reorderPropertyImages: vi.fn(),
    setPropertyCoverImage: vi.fn(),
    uploadPropertyImage: vi.fn(),
}));

const validProperty: Property = {
    id: 1,
    reference_code: "AP-001",
    title: "Apartamento no Centro",
    description: null,
    property_type: "house",
    purpose: "sale",
    status: "available",
    zip_code: "89251000",
    state: "SC",
    city: "Jaraguá do Sul",
    neighborhood: "Centro",
    street: "Rua Reinoldo Rau",
    number: "100",
    complement: null,
    latitude: null,
    longitude: null,
    show_exact_address: false,
    sale_price: 550000,
    rent_price: null,
    property_tax: null,
    condo_fee: null,
    accepts_financing: false,
    accepts_exchange: false,
    show_price: true,
    usable_area: 80,
    total_area: null,
    bedrooms: 2,
    suites: 0,
    bathrooms: 1,
    garage_spaces: 1,
    floor_number: null,
    total_floors: null,
    build_year: null,
    video_url: null,
    virtual_tour_url: null,
    owner_id: null,
    broker_id: null,
    internal_notes: null,
    has_exclusive_right: false,
    exclusive_right_expiration_date: null,
    keys_location: null,
    is_published: false,
    is_highlighted: false,
    images: [],
    features: [],
    created_at: "2026-11-01T00:00:00Z",
    updated_at: "2026-11-01T00:00:00Z",
};

function openStep(name: RegExp) {
    fireEvent.mouseDown(screen.getByRole("tab", { name }), { button: 0 });
}

describe("PropertyForm step gating", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("keeps Próxima disabled and lists the missing fields of an empty first step", () => {
        render(<PropertyForm mode="create" />);

        expect(screen.getByRole("button", { name: /próxima/i })).toBeDisabled();
        expect(
            screen.getByText("Campos pendentes: Código de Referência, Título, Tipo de Imóvel, Finalidade, Status"),
        ).toBeInTheDocument();
        // The stepper cannot be used to skip the gate.
        expect(screen.getByRole("tab", { name: /características/i })).toBeDisabled();
        expect(screen.getByRole("tab", { name: /gestão interna/i })).toBeDisabled();
    });

    it("does not paint errors on untouched fields just because Próxima is disabled", () => {
        render(<PropertyForm mode="create" />);

        expect(screen.getByLabelText(/código de referência/i)).not.toHaveAttribute("aria-invalid", "true");
    });

    it("enables Próxima once the step's required fields are filled", async () => {
        render(<PropertyForm initialData={{ ...validProperty, reference_code: "" }} mode="edit" />);

        const next = screen.getByRole("button", { name: /próxima/i });
        await waitFor(() => expect(next).toBeDisabled());
        expect(screen.getByText("Campos pendentes: Código de Referência")).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText(/código de referência/i), { target: { value: "AP-002" } });

        await waitFor(() => expect(next).toBeEnabled());
        expect(screen.queryByText(/campos pendentes/i)).not.toBeInTheDocument();
    });

    it("enables every step and the final save for a property that is already valid", async () => {
        render(<PropertyForm initialData={validProperty} mode="edit" />);

        await waitFor(() => expect(screen.getByRole("button", { name: /próxima/i })).toBeEnabled());
        expect(screen.getByRole("tab", { name: /gestão interna/i })).toBeEnabled();

        openStep(/gestão interna/i);

        expect(await screen.findByRole("button", { name: /salvar alterações/i })).toBeEnabled();
    });

    it("moves from the penultimate step to the last one without saving", async () => {
        render(<PropertyForm initialData={validProperty} mode="edit" />);

        await waitFor(() => expect(screen.getByRole("button", { name: /próxima/i })).toBeEnabled());
        openStep(/mídias/i);
        fireEvent.click(await screen.findByRole("button", { name: /próxima/i }));

        expect(await screen.findByRole("button", { name: /salvar alterações/i })).toBeInTheDocument();
        await new Promise((resolve) => setTimeout(resolve, 50));
        expect(mocks.update).not.toHaveBeenCalled();
        expect(mocks.create).not.toHaveBeenCalled();
    });

    it("keeps the final save disabled until the whole form is valid", async () => {
        render(
            <PropertyForm
                initialData={{ ...validProperty, has_exclusive_right: true, exclusive_right_expiration_date: null }}
                mode="edit"
            />,
        );

        await waitFor(() => expect(screen.getByRole("tab", { name: /gestão interna/i })).toBeEnabled());
        openStep(/gestão interna/i);

        expect(await screen.findByRole("button", { name: /salvar alterações/i })).toBeDisabled();
        expect(screen.getByText("Revise as etapas: Gestão Interna")).toBeInTheDocument();
        expect(mocks.update).not.toHaveBeenCalled();
    });
});

/** Types one key at a time, appending to what the field shows (like a browser). */
function typeKeys(field: HTMLElement, keys: string) {
    for (const key of keys) {
        const input = field as HTMLInputElement;
        fireEvent.change(input, { target: { value: input.value + key } });
    }
}

describe("PropertyForm live validation", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("flags an emptied bedrooms count as required and blocks Próxima", async () => {
        render(<PropertyForm initialData={validProperty} mode="edit" />);
        await waitFor(() => expect(screen.getByRole("tab", { name: /características/i })).toBeEnabled());
        openStep(/características/i);

        const bedrooms = await screen.findByLabelText(/^quartos/i);
        fireEvent.change(bedrooms, { target: { value: "" } });
        fireEvent.blur(bedrooms);

        expect(await screen.findByText("Informe a quantidade de quartos")).toBeInTheDocument();
        expect(bedrooms).toHaveAttribute("aria-invalid", "true");
        expect(screen.getByRole("button", { name: /próxima/i })).toBeDisabled();
        expect(screen.getByText("Campos pendentes: Quartos")).toBeInTheDocument();
    });

    it("rejects a construction year more than ten years ahead as soon as it is typed", async () => {
        const year = new Date().getFullYear();
        render(<PropertyForm initialData={validProperty} mode="edit" />);
        await waitFor(() => expect(screen.getByRole("tab", { name: /características/i })).toBeEnabled());
        openStep(/características/i);

        const buildYear = await screen.findByLabelText(/ano de construção/i);
        typeKeys(buildYear, String(year + 11));

        expect(await screen.findByText(`Informe um ano até ${year + 10}`)).toBeInTheDocument();
        expect(buildYear).toHaveAttribute("aria-invalid", "true");

        fireEvent.change(buildYear, { target: { value: "" } });
        typeKeys(buildYear, String(year + 10));

        await waitFor(() => expect(screen.queryByText(`Informe um ano até ${year + 10}`)).not.toBeInTheDocument());
        expect(buildYear).not.toHaveAttribute("aria-invalid", "true");
    });

    it("accepts a 20.000 m² usable area typed key by key", async () => {
        render(<PropertyForm initialData={validProperty} mode="edit" />);
        await waitFor(() => expect(screen.getByRole("tab", { name: /características/i })).toBeEnabled());
        openStep(/características/i);

        const usableArea = await screen.findByLabelText(/área útil/i);
        fireEvent.change(usableArea, { target: { value: "" } });
        typeKeys(usableArea, "20000");
        fireEvent.blur(usableArea);

        expect(usableArea).toHaveValue("20.000");
        await waitFor(() => expect(screen.getByRole("button", { name: /próxima/i })).toBeEnabled());
        expect(usableArea).not.toHaveAttribute("aria-invalid", "true");
    });
});
