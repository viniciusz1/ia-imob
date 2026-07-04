import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ValuationsClient } from "../ValuationsClient";
import * as valuationService from "@/services/valuationService";
import * as marketPropertyService from "@/services/marketPropertyService";
import { useAuthStore } from "@/store/useAuthStore";
import type { ComparableCandidate, PaginatedValuationsResponse, Valuation } from "@/types/valuation";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/services/valuationService", () => ({
  createValuation: vi.fn(),
  downloadValuationComparables: vi.fn(),
  downloadValuationReport: vi.fn(),
  downloadValuationWordReport: vi.fn(),
  getValuationCandidates: vi.fn(),
  getValuation: vi.fn(),
  getValuations: vi.fn(),
}));

vi.mock("@/services/marketPropertyService", () => ({
  getMarketPropertyFilters: vi.fn(),
}));

const calculatedValuation: Valuation = {
  id: 2,
  code: "AVL-2026-000002",
  status: "calculated",
  status_label: "Calculada",
  subject_property: {
    city: "Jaraguá do Sul",
    neighborhood: "Centro",
    residential_type: "house",
    residential_type_label: "Casa",
    area: 120,
    bedrooms: 3,
    bathrooms: 2,
    garage_spaces: 2,
    flood_risk: true,
  },
  base_range: {
    min: 660000,
    central: 720000,
    max: 780000,
    display: {
      min: "R$ 660.000",
      central: "R$ 720.000",
      max: "R$ 780.000",
    },
  },
  final_range: {
    min: 462000,
    central: 504000,
    max: 546000,
    display: {
      min: "R$ 462.000",
      central: "R$ 504.000",
      max: "R$ 546.000",
    },
  },
  flood_adjustment_percent: 30,
  sample_summary: {
    total_found: 7,
    invalid_count: 1,
    outlier_count: 1,
    used_count: 5,
    minimum_required: 5,
  },
  comparable_evidence: [
    {
      market_property_id: 10,
      residential_type: "house",
      raw_type: "Casa",
      city: "Jaraguá do Sul",
      neighborhood: "Centro",
      bedrooms: 3,
      bathrooms: 2,
      garage_spaces: 2,
      area: 100,
      price: 600000,
      price_per_square_meter: 6000,
      agency: "Imobiliária Teste",
      link: "https://example.com/imovel",
    },
  ],
  can_download_report: true,
  calculation_summary:
    "A avaliação usa 5 imóveis comparáveis no mesmo bairro e cidade. A faixa de mercado usa p25, mediana e p75 do valor por metro quadrado. Foi aplicado ajuste de -30% por risco de enchente informado.",
  created_by: {
    id: 1,
    name: "Corretor",
    email: "corretor@example.com",
  },
  created_at: "2026-06-09T00:00:00.000000Z",
};

const insufficientValuation: Valuation = {
  ...calculatedValuation,
  id: 3,
  code: "AVL-2026-000003",
  status: "insufficient_sample",
  status_label: "Amostra insuficiente",
  base_range: null,
  final_range: null,
  flood_adjustment_percent: null,
  sample_summary: {
    total_found: 2,
    minimum_required: 5,
  },
  comparable_evidence: [],
  can_download_report: false,
  calculation_summary:
    "Não há imóveis comparáveis válidos suficientes no mesmo bairro e cidade. Foram encontrados 2 comparáveis e o mínimo necessário é 5.",
};

const comparableCandidates: ComparableCandidate[] = [
  {
    market_property_id: 10,
    residential_type: "house",
    raw_type: "Casa",
    city: "Jaraguá do Sul",
    neighborhood: "Centro",
    bedrooms: 3,
    bathrooms: 2,
    garage_spaces: 2,
    area: 100,
    price: 600000,
    price_per_square_meter: 6000,
    agency: "Imobiliária A",
    link: "https://example.com/a",
    review_status: "pending",
  },
  {
    market_property_id: 11,
    residential_type: "house",
    raw_type: "Casa",
    city: "Jaraguá do Sul",
    neighborhood: "Centro",
    bedrooms: 3,
    bathrooms: 2,
    garage_spaces: 2,
    area: 110,
    price: 770000,
    price_per_square_meter: 7000,
    agency: "Imobiliária B",
    link: "https://example.com/b",
    review_status: "pending",
  },
];

function paginated(data: Valuation[]): PaginatedValuationsResponse {
  return {
    data,
    meta: {
      current_page: 1,
      last_page: 1,
      per_page: 15,
      total: data.length,
      from: data.length > 0 ? 1 : null,
      to: data.length,
    },
    links: {
      first: null,
      last: null,
      prev: null,
      next: null,
    },
  };
}

describe("ValuationsClient", () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
    useAuthStore.getState().setUser({
      id: 1,
      name: "Corretor",
      email: "corretor@example.com",
      permissions: ["valuations.create", "valuations.view"],
    });
    globalThis.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    vi.mocked(valuationService.createValuation).mockReset();
    vi.mocked(valuationService.downloadValuationComparables).mockReset();
    vi.mocked(valuationService.downloadValuationReport).mockReset();
    vi.mocked(valuationService.downloadValuationWordReport).mockReset();
    vi.mocked(valuationService.getValuationCandidates).mockReset();
    vi.mocked(valuationService.getValuation).mockReset();
    vi.mocked(valuationService.getValuations).mockReset();
    vi.mocked(marketPropertyService.getMarketPropertyFilters).mockReset();
    vi.mocked(marketPropertyService.getMarketPropertyFilters).mockResolvedValue({
      tipos: ["casa", "apartamento"],
      bairros: ["Centro", "Vila Lalau"],
      cidades: ["Jaraguá do Sul"],
      imobiliarias: [],
      quartos: [3],
      suites: [],
      banheiros: [2],
      vagas: [1, 2],
    });
  });

  it("reviews comparable candidates before creating a valuation", async () => {
    vi.mocked(valuationService.getValuations)
      .mockResolvedValueOnce(paginated([]))
      .mockResolvedValueOnce(paginated([calculatedValuation]));
    vi.mocked(valuationService.getValuationCandidates).mockResolvedValue(comparableCandidates);
    vi.mocked(valuationService.createValuation).mockResolvedValue(calculatedValuation);

    render(<ValuationsClient />);

    const citySelect = await screen.findByLabelText("Cidade") as HTMLSelectElement;
    const neighborhoodSelect = await screen.findByLabelText("Bairro") as HTMLSelectElement;

    await waitFor(() => {
      expect(citySelect.options.length).toBeGreaterThan(0);
      expect(neighborhoodSelect.options.length).toBeGreaterThan(0);
    });

    fireEvent.change(citySelect, { target: { value: "Jaraguá do Sul" } });
    fireEvent.change(neighborhoodSelect, { target: { value: "Centro" } });

    fireEvent.click(screen.getByRole("button", { name: /buscar comparáveis/i }));

    expect(await screen.findByText("Revisão de comparáveis")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /visualizar imóvel/i })).toHaveLength(2);

    fireEvent.click(screen.getByRole("checkbox", { name: /selecionar comparável imobiliária a/i }));
    fireEvent.click(screen.getByRole("button", { name: /marcar como válido/i }));

    fireEvent.click(screen.getByRole("button", { name: /status do comparável imobiliária b: pendente/i }));
    fireEvent.click(screen.getByRole("button", { name: /status do comparável imobiliária b: válido/i }));

    fireEvent.click(screen.getByRole("button", { name: /calcular avaliação/i }));

    await waitFor(() => {
      expect(valuationService.createValuation).toHaveBeenCalledWith({
        city: ["Jaraguá do Sul"],
        neighborhood: ["Centro"],
        residential_type: "house",
        area: 100,
        bedrooms: 3,
        bathrooms: 2,
        garage_spaces: 1,
        flood_risk: false,
        comparable_reviews: [
          { market_property_id: 10, status: "approved" },
          { market_property_id: 11, status: "rejected" },
        ],
      });
    });

    expect(await screen.findByText("AVL-2026-000002 - Calculada")).toBeInTheDocument();
  });

  it("blocks the valuation surface for users without valuation permissions", async () => {
    useAuthStore.getState().setUser({
      id: 1,
      name: "Corretor",
      email: "corretor@example.com",
      permissions: ["properties.view"],
    });
    vi.mocked(valuationService.getValuations).mockResolvedValue(paginated([]));

    render(<ValuationsClient />);

    expect(await screen.findByText("Acesso indisponível")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /calcular avaliação/i })).not.toBeInTheDocument();
    expect(valuationService.getValuations).not.toHaveBeenCalled();
  });

  it("renders calculated valuation details and downloads the report", async () => {
    vi.mocked(valuationService.getValuations).mockResolvedValue(paginated([calculatedValuation]));
    vi.mocked(valuationService.downloadValuationComparables).mockResolvedValue();
    vi.mocked(valuationService.downloadValuationReport).mockResolvedValue();
    vi.mocked(valuationService.downloadValuationWordReport).mockResolvedValue();

    render(<ValuationsClient />);

    expect(await screen.findByText("AVL-2026-000002 - Calculada")).toBeInTheDocument();
    expect(screen.getAllByText("R$ 504.000").length).toBeGreaterThan(0);
    expect(screen.getByText(/ajuste aplicado: -30% por risco de enchente/i)).toBeInTheDocument();
    expect(screen.getByText("Imobiliária Teste")).toBeInTheDocument();
    expect(screen.getByText("R$ 6.000")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /baixar pdf/i }));
    fireEvent.click(screen.getByRole("button", { name: /baixar word/i }));
    fireEvent.click(screen.getByRole("button", { name: /exportar excel/i }));

    await waitFor(() => {
      expect(valuationService.downloadValuationReport).toHaveBeenCalledWith(calculatedValuation);
      expect(valuationService.downloadValuationWordReport).toHaveBeenCalledWith(calculatedValuation);
      expect(valuationService.downloadValuationComparables).toHaveBeenCalledWith(calculatedValuation);
    });
  });

  it("uses valuation glossary terms and hides report downloads for insufficient samples", async () => {
    vi.mocked(valuationService.getValuations).mockResolvedValue(paginated([insufficientValuation]));

    render(<ValuationsClient />);

    expect(await screen.findByText("AVL-2026-000003 - Amostra insuficiente")).toBeInTheDocument();
    expect(screen.getByLabelText("Risco de enchente")).toBeInTheDocument();
    expect(screen.getAllByText(insufficientValuation.calculation_summary).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /baixar pdf/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /baixar word/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /exportar excel/i })).not.toBeInTheDocument();
  });
});
