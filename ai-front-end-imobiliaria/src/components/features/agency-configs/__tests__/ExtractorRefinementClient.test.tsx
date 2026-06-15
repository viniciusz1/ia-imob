import { render, screen } from "@testing-library/react";
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
});
