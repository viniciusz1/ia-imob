import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { ExtractorRefinementClient } from "../ExtractorRefinementClient";
import { useAgencyExtractorRefinement } from "@/hooks/useAgencyExtractorRefinement";
import type { AgencyExtractorRefinement } from "@/types/agencyRefinement";

vi.mock("@/hooks/useAgencyExtractorRefinement", () => ({
    useAgencyExtractorRefinement: vi.fn(),
}));

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
    });

    it("shows agency context and no-evidence state", () => {
        vi.mocked(useAgencyExtractorRefinement).mockReturnValue({
            data: refinementWithoutEvidence,
            isLoading: false,
            error: null,
        } as ReturnType<typeof useAgencyExtractorRefinement>);

        render(<ExtractorRefinementClient agencyType="sitemap" agencyId={7} />);

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

        render(<ExtractorRefinementClient agencyType="sitemap" agencyId={7} />);

        expect(screen.getByRole("heading", { name: /Campos do extrator/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /tipo.*2 extractors/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /valor.*1 extractor/i })).toBeInTheDocument();
        expect(screen.getByText("Prioridade 1")).toBeInTheDocument();
        expect(screen.getByText("title")).toBeInTheDocument();
        expect(screen.getByText("h1::text")).toBeInTheDocument();
        expect(screen.getByText("https://alpha.test/imovel/1")).toBeInTheDocument();
        expect(screen.getByText(/Casa Centro/)).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: /HTML 2/i }));

        expect(screen.getByText("https://alpha.test/imovel/2")).toBeInTheDocument();
        expect(screen.getByText(/Apartamento Sul/)).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: /valor.*1 extractor/i }));

        expect(screen.getByText(".price::text")).toBeInTheDocument();
    });
});
