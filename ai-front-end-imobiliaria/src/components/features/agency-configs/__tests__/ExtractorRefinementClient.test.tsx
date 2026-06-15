import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach, type ReactNode } from "vitest";

import { ExtractorRefinementClient } from "../ExtractorRefinementClient";
import { useAgencyExtractorRefinement } from "@/hooks/useAgencyExtractorRefinement";
import { useExtractorRefinementPreview } from "@/hooks/useExtractorRefinementPreview";
import type { AgencyExtractorRefinement } from "@/types/agencyRefinement";

function renderWithQueryClient(node: ReactNode) {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(<QueryClientProvider client={queryClient}>{node}</QueryClientProvider>);
}

vi.mock("@/hooks/useAgencyExtractorRefinement", () => ({
    useAgencyExtractorRefinement: vi.fn(),
}));

vi.mock("@/hooks/useExtractorRefinementPreview", () => ({
    useExtractorRefinementPreview: vi.fn(),
}));

vi.mock("@/services/agencyConfigService", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/services/agencyConfigService")>();
    return {
        ...actual,
        saveExtractorRefinement: vi.fn(),
    };
});

import * as agencyConfigService from "@/services/agencyConfigService";

const refinementWithoutEvidence: AgencyExtractorRefinement = {
    agency: {
        id: 7,
        agency_type: "sitemap",
        name: "Alpha Imóveis",
        domain: "alpha.test",
        is_active: true,
        expected_min_items: null,
        sitemap_url: "https://alpha.test/sitemap.xml",
        allowed_url_patterns: null,
        extractors: [],
    },
    evidence_available: false,
    evidence: [],
};

const refinementWithEvidence: AgencyExtractorRefinement = {
    agency: {
        id: 7,
        agency_type: "sitemap",
        name: "Alpha Imóveis",
        domain: "alpha.test",
        is_active: true,
        expected_min_items: null,
        sitemap_url: "https://alpha.test/sitemap.xml",
        allowed_url_patterns: null,
        extractors: [
            {
                id: 101,
                agency_type: "sitemap",
                agency_id: 7,
                field_name: "tipo",
                priority: 1,
                source_type: "og",
                selector_value: "title",
                selector_index: null,
                selector_params: null,
                selector_join: false,
                pipeline: null,
                output_type: "text",
                is_optional: false,
            },
            {
                id: 102,
                agency_type: "sitemap",
                agency_id: 7,
                field_name: "tipo",
                priority: 2,
                source_type: "css",
                selector_value: "h1::text",
                selector_index: null,
                selector_params: null,
                selector_join: false,
                pipeline: "strip",
                output_type: "text",
                is_optional: false,
            },
            {
                id: 103,
                agency_type: "sitemap",
                agency_id: 7,
                field_name: "valor",
                priority: 1,
                source_type: "css",
                selector_value: ".price::text",
                selector_index: null,
                selector_params: null,
                selector_join: false,
                pipeline: null,
                output_type: "number",
                is_optional: false,
            },
        ],
    },
    evidence_available: true,
    evidence: [
        {
            id: 201,
            attempt_id: 31,
            sample_index: 0,
            url: "https://alpha.test/imovel/1",
            content_hash: "hash-1",
            html: "<html><body><h1>Casa Centro</h1></body></html>",
            captured_at: "2026-06-15T10:00:00Z",
        },
        {
            id: 202,
            attempt_id: 31,
            sample_index: 1,
            url: "https://alpha.test/imovel/2",
            content_hash: "hash-2",
            html: "<html><body><h1>Apartamento Sul</h1></body></html>",
            captured_at: "2026-06-15T10:01:00Z",
        },
    ],
};

describe("ExtractorRefinementClient", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useExtractorRefinementPreview).mockReturnValue({
            data: null,
            isLoading: false,
            error: null,
        } as ReturnType<typeof useExtractorRefinementPreview>);
    });

    it("shows agency context and no-evidence state", () => {
        vi.mocked(useAgencyExtractorRefinement).mockReturnValue({
            data: refinementWithoutEvidence,
            isLoading: false,
            error: null,
        } as ReturnType<typeof useAgencyExtractorRefinement>);

        renderWithQueryClient(<ExtractorRefinementClient agencyType="sitemap" agencyId={7} />);

        expect(screen.getByRole("heading", { name: /Verificar extratores/i })).toBeInTheDocument();
        expect(screen.getByText("Alpha Imóveis")).toBeInTheDocument();
        expect(screen.getByText("sitemap")).toBeInTheDocument();
        expect(screen.getByText("alpha.test")).toBeInTheDocument();
        expect(screen.getByText(/Sem Evidencia HTML/i)).toBeInTheDocument();
        expect(screen.getByText(/rode o Cadastrador ou reonboard/i)).toBeInTheDocument();
    });

    it("summarizes extractors by field and switches between captured HTML evidence", () => {
        vi.mocked(useAgencyExtractorRefinement).mockReturnValue({
            data: refinementWithEvidence,
            isLoading: false,
            error: null,
        } as ReturnType<typeof useAgencyExtractorRefinement>);

        renderWithQueryClient(<ExtractorRefinementClient agencyType="sitemap" agencyId={7} />);

        expect(screen.getByRole("heading", { name: /Campos do extrator/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /tipo.*2 extractors/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /valor.*1 extractor/i })).toBeInTheDocument();
        expect(screen.getByText("Prioridade 1")).toBeInTheDocument();
        expect(screen.getByDisplayValue("title")).toBeInTheDocument();
        expect(screen.getByDisplayValue("h1::text")).toBeInTheDocument();
        expect(screen.getByText("https://alpha.test/imovel/1")).toBeInTheDocument();
        expect(screen.getByText(/Casa Centro/)).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: /HTML 2/i }));

        expect(screen.getByText("https://alpha.test/imovel/2")).toBeInTheDocument();
        expect(screen.getByText(/Apartamento Sul/)).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: /valor.*1 extractor/i }));

        expect(screen.getByDisplayValue(".price::text")).toBeInTheDocument();
    });

    it("shows rendered and source HTML views with selected evidence highlighted", () => {
        vi.mocked(useAgencyExtractorRefinement).mockReturnValue({
            data: refinementWithEvidence,
            isLoading: false,
            error: null,
        } as ReturnType<typeof useAgencyExtractorRefinement>);
        vi.mocked(useExtractorRefinementPreview).mockReturnValue({
            data: {
                results: [
                    {
                        evidence_id: 201,
                        sample_index: 0,
                        url: "https://alpha.test/imovel/1",
                        status: "extraiu valor",
                        value: "Casa Centro",
                        used_priority: 2,
                        selected_evidence: {
                            kind: "selector",
                            source_type: "css",
                            selector_value: "h1::text",
                            matches_count: 1,
                            selected_indexes: [0],
                            fragments: ["Casa Centro"],
                        },
                    },
                    {
                        evidence_id: 202,
                        sample_index: 1,
                        url: "https://alpha.test/imovel/2",
                        status: "extraiu valor",
                        value: "Apartamento Sul",
                        used_priority: 2,
                        selected_evidence: {
                            kind: "selector",
                            source_type: "css",
                            selector_value: "h1::text",
                            matches_count: 1,
                            selected_indexes: [0],
                            fragments: ["Apartamento Sul"],
                        },
                    },
                ],
            },
            isLoading: false,
            error: null,
        } as ReturnType<typeof useExtractorRefinementPreview>);

        renderWithQueryClient(<ExtractorRefinementClient agencyType="sitemap" agencyId={7} />);

        expect(screen.getByRole("heading", { name: /Visualização renderizada/i })).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: /Código HTML/i })).toBeInTheDocument();
        const frame = screen.getByTitle("Visualização renderizada da Evidencia HTML");
        expect(frame).toHaveAttribute(
            "srcdoc",
            expect.stringContaining("<mark data-refinement-highlight>Casa Centro</mark>")
        );
        expect(screen.getByText("Casa Centro", { selector: "mark" })).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: /HTML 2/i }));

        expect(frame).toHaveAttribute(
            "srcdoc",
            expect.stringContaining("<mark data-refinement-highlight>Apartamento Sul</mark>")
        );
        expect(screen.getByText("Apartamento Sul", { selector: "mark" })).toBeInTheDocument();
    });

    it("allows editing extractor selector and triggers preview", async () => {
        const refetch = vi.fn();
        vi.mocked(useAgencyExtractorRefinement).mockReturnValue({
            data: refinementWithEvidence,
            isLoading: false,
            error: null,
        } as ReturnType<typeof useAgencyExtractorRefinement>);
        vi.mocked(useExtractorRefinementPreview).mockReturnValue({
            data: { results: [] },
            isLoading: false,
            error: null,
            refetch,
        } as unknown as ReturnType<typeof useExtractorRefinementPreview>);

        renderWithQueryClient(<ExtractorRefinementClient agencyType="sitemap" agencyId={7} />);

        const selectorInput = screen.getAllByPlaceholderText("h1::text")[0];
        fireEvent.change(selectorInput, { target: { value: "h2::text" } });

        expect(selectorInput).toHaveValue("h2::text");
        expect(screen.getByRole("button", { name: /Salvar/i })).toBeEnabled();
    });

    it("adds and removes fallback priorities", () => {
        vi.mocked(useAgencyExtractorRefinement).mockReturnValue({
            data: refinementWithEvidence,
            isLoading: false,
            error: null,
        } as ReturnType<typeof useAgencyExtractorRefinement>);

        renderWithQueryClient(<ExtractorRefinementClient agencyType="sitemap" agencyId={7} />);

        expect(screen.getAllByLabelText(/Selector \/ Valor/i)).toHaveLength(2);

        fireEvent.click(screen.getByRole("button", { name: /Adicionar fallback/i }));

        expect(screen.getAllByLabelText(/Selector \/ Valor/i)).toHaveLength(3);

        fireEvent.click(screen.getAllByRole("button", { name: /Remover prioridade/i })[0]);

        expect(screen.getAllByLabelText(/Selector \/ Valor/i)).toHaveLength(2);
    });

    it("saves refinement by calling the service", async () => {
        const refetch = vi.fn();
        vi.mocked(useAgencyExtractorRefinement).mockReturnValue({
            data: refinementWithEvidence,
            isLoading: false,
            error: null,
        } as ReturnType<typeof useAgencyExtractorRefinement>);
        vi.mocked(useExtractorRefinementPreview).mockReturnValue({
            data: { results: [] },
            isLoading: false,
            error: null,
            refetch,
        } as unknown as ReturnType<typeof useExtractorRefinementPreview>);

        const saveMock = vi
            .spyOn(agencyConfigService, "saveExtractorRefinement")
            .mockResolvedValue({ agency: refinementWithEvidence.agency, extractors: refinementWithEvidence.agency.extractors });

        renderWithQueryClient(<ExtractorRefinementClient agencyType="sitemap" agencyId={7} />);

        const selectorInput = screen.getAllByPlaceholderText("h1::text")[0];
        fireEvent.change(selectorInput, { target: { value: "h2::text" } });

        fireEvent.click(screen.getByRole("button", { name: /Salvar/i }));

        await waitFor(() => {
            expect(saveMock).toHaveBeenCalledWith(
                "sitemap",
                7,
                expect.objectContaining({
                    field_name: "tipo",
                    extractors: expect.arrayContaining([
                        expect.objectContaining({ selector_value: "h2::text" }),
                    ]),
                })
            );
        });
    });
});
