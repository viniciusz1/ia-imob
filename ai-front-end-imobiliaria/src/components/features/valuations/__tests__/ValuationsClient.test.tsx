import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  purpose: "sale",
  purpose_label: "Venda",
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
      is_platform_admin: false,
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
    vi.mocked(marketPropertyService.getMarketPropertyFilters).mockImplementation(async (city) => ({
      tipos: ["casa", "apartamento"],
      bairros: city === "Joinville" ? ["América"] : ["Centro", "Vila Lalau"],
      cidades: ["Jaraguá do Sul", "Joinville"],
      imobiliarias: [],
      quartos: [3],
      suites: [],
      banheiros: [2],
      vagas: [1, 2],
    }));
  });

  it.each(["sale", "rent"] as const)("reviews %s comparable candidates before creating a valuation", async (purpose) => {
    const result: Valuation = { ...calculatedValuation, purpose, purpose_label: purpose === "rent" ? "Locação mensal" : "Venda" };
    vi.mocked(valuationService.getValuations)
      .mockResolvedValueOnce(paginated([]))
      .mockResolvedValueOnce(paginated([result]));
    vi.mocked(valuationService.getValuationCandidates).mockResolvedValue(comparableCandidates.map((candidate) => ({ ...candidate, purpose, price: purpose === "rent" ? 2350.50 : candidate.price })));
    vi.mocked(valuationService.createValuation).mockResolvedValue(result);

    render(<ValuationsClient />);

    const citySelect = await screen.findByLabelText("Cidade") as HTMLSelectElement;
    const neighborhoodSelect = await screen.findByLabelText("Bairro") as HTMLSelectElement;

    await waitFor(() => {
      expect(citySelect.options.length).toBeGreaterThan(0);
      expect(neighborhoodSelect.options.length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole("radio", { name: purpose === "rent" ? "Locação" : "Venda" }));
    fireEvent.change(citySelect, { target: { value: "Jaraguá do Sul" } });
    await waitFor(() => expect(neighborhoodSelect).toBeEnabled());
    fireEvent.change(neighborhoodSelect, { target: { value: "Centro" } });

    fireEvent.click(screen.getByRole("button", { name: /buscar comparáveis/i }));

    expect(await screen.findByText("Revisão de comparáveis")).toBeInTheDocument();
    expect(valuationService.getValuationCandidates).toHaveBeenCalledWith(expect.objectContaining({ purpose }));
    if (purpose === "rent") expect(screen.getAllByText(/2\.350,50/)).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: /visualizar imóvel/i })).toHaveLength(2);

    fireEvent.click(screen.getByRole("checkbox", { name: /selecionar comparável imobiliária a/i }));
    fireEvent.click(screen.getByRole("button", { name: /marcar como válido/i }));

    fireEvent.click(screen.getByRole("button", { name: /status do comparável imobiliária b: pendente/i }));
    fireEvent.click(screen.getByRole("button", { name: /status do comparável imobiliária b: válido/i }));

    fireEvent.click(screen.getByRole("button", { name: /calcular avaliação/i }));

    await waitFor(() => {
      expect(valuationService.createValuation).toHaveBeenCalledWith({
        purpose,
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

    expect(await screen.findByText(`AVL-2026-000002 - ${result.purpose_label} - Calculada`)).toBeInTheDocument();
  });

  it("clears the neighborhood when changing or removing the city and loads only matching options", async () => {
    vi.mocked(valuationService.getValuations).mockResolvedValue(paginated([]));
    vi.mocked(valuationService.getValuationCandidates).mockResolvedValue([]);
    render(<ValuationsClient />);

    const city = await screen.findByRole<HTMLSelectElement>("combobox", { name: "Cidade" });
    await waitFor(() => expect(city).toBeEnabled());
    expect(city).toHaveValue("");
    expect(city).toHaveDisplayValue("Selecione uma cidade");
    expect(city.multiple).toBe(false);
    expect(city).not.toHaveAttribute("size");
    expect(screen.queryByText(/selecionar várias cidades/)).not.toBeInTheDocument();

    const neighborhood = screen.getByLabelText<HTMLSelectElement>("Bairro");
    expect(neighborhood).toBeDisabled();
    expect(neighborhood).toHaveDisplayValue("Selecione primeiro uma cidade");

    for (const name of ["Jaraguá do Sul", "Joinville"]) {
      fireEvent.change(city, { target: { value: name } });
      expect(city).toHaveValue(name);
      expect(city.selectedOptions).toHaveLength(1);
      expect(neighborhood).toHaveValue("");
      expect(neighborhood).toBeDisabled();
      await waitFor(() => expect(neighborhood).toBeEnabled());
      const expectedNeighborhood = name === "Joinville" ? "América" : "Centro";
      expect(marketPropertyService.getMarketPropertyFilters).toHaveBeenLastCalledWith(name);
      expect(Array.from(neighborhood.options).map((option) => option.value)).not.toContain(name === "Joinville" ? "Centro" : "América");
      fireEvent.change(neighborhood, { target: { value: expectedNeighborhood } });
      fireEvent.click(screen.getByRole("button", { name: /buscar comparáveis/i }));
      await waitFor(() => expect(valuationService.getValuationCandidates).toHaveBeenLastCalledWith(
        expect.objectContaining({ city: [name], neighborhood: [expectedNeighborhood] }),
      ));
      await waitFor(() => expect(screen.getByRole("button", { name: /buscar comparáveis/i })).toBeEnabled());
    }

    fireEvent.change(city, { target: { value: "" } });
    expect(city).toHaveValue("");
    expect(city).toHaveDisplayValue("Selecione uma cidade");
    expect(city.checkValidity()).toBe(false);
    expect(neighborhood.multiple).toBe(false);
    expect(neighborhood).toBeDisabled();
    expect(neighborhood).toHaveValue("");
    expect(neighborhood.options).toHaveLength(1);
  });

  it("selects and replaces a single neighborhood while preserving the API array contract", async () => {
    vi.mocked(valuationService.getValuations).mockResolvedValue(paginated([]));
    vi.mocked(valuationService.getValuationCandidates).mockResolvedValue([]);
    render(<ValuationsClient />);

    const neighborhood = await screen.findByRole<HTMLSelectElement>("combobox", { name: "Bairro" });
    const city = screen.getByRole("combobox", { name: "Cidade" });
    await waitFor(() => expect(city).toBeEnabled());
    fireEvent.change(city, { target: { value: "Jaraguá do Sul" } });
    await waitFor(() => expect(neighborhood).toBeEnabled());
    expect(neighborhood).toHaveValue("");
    expect(neighborhood).toHaveDisplayValue("Selecione um bairro");
    expect(neighborhood.multiple).toBe(false);
    expect(neighborhood).not.toHaveAttribute("size");
    expect(neighborhood.checkValidity()).toBe(false);
    expect(screen.queryByText(/selecionar vários bairros/)).not.toBeInTheDocument();

    for (const name of ["Centro", "Vila Lalau"]) {
      fireEvent.change(neighborhood, { target: { value: name } });
      expect(neighborhood).toHaveValue(name);
      expect(neighborhood.selectedOptions).toHaveLength(1);
      expect(city).toHaveValue("Jaraguá do Sul");
      fireEvent.click(screen.getByRole("button", { name: /buscar comparáveis/i }));
      await waitFor(() => expect(valuationService.getValuationCandidates).toHaveBeenLastCalledWith(
        expect.objectContaining({ city: ["Jaraguá do Sul"], neighborhood: [name] }),
      ));
      await waitFor(() => expect(screen.getByRole("button", { name: /buscar comparáveis/i })).toBeEnabled());
    }

    fireEvent.click(screen.getByRole("button", { name: "Nova avaliação" }));
    expect(neighborhood).toHaveValue("");
    expect(neighborhood).toHaveDisplayValue("Selecione primeiro uma cidade");
  });

  it("ignores late neighborhood responses from a previous city", async () => {
    vi.mocked(valuationService.getValuations).mockResolvedValue(paginated([]));
    render(<ValuationsClient />);
    const city = await screen.findByRole("combobox", { name: "Cidade" });
    await waitFor(() => expect(city).toBeEnabled());
    const neighborhood = screen.getByRole<HTMLSelectElement>("combobox", { name: "Bairro" });
    let resolveOld: (filters: marketPropertyService.MarketPropertyFiltersResponse) => void = () => {};
    const oldResponse = new Promise<marketPropertyService.MarketPropertyFiltersResponse>((resolve) => { resolveOld = resolve; });
    vi.mocked(marketPropertyService.getMarketPropertyFilters).mockImplementationOnce(() => oldResponse);
    fireEvent.change(city, { target: { value: "Jaraguá do Sul" } });
    fireEvent.change(city, { target: { value: "Joinville" } });
    await waitFor(() => expect(neighborhood).toBeEnabled());
    fireEvent.change(neighborhood, { target: { value: "América" } });
    await act(async () => {
      resolveOld({ tipos: [], cidades: [], bairros: ["Centro"], imobiliarias: [], quartos: [], suites: [], banheiros: [], vagas: [] });
      await oldResponse;
    });
    expect(neighborhood).toHaveValue("América");
    expect(Array.from(neighborhood.options).map((option) => option.value)).not.toContain("Centro");
  });

  it("clears reviewed candidates when the purpose changes", async () => {
    vi.mocked(valuationService.getValuations).mockResolvedValue(paginated([]));
    vi.mocked(valuationService.getValuationCandidates).mockResolvedValue(comparableCandidates);
    render(<ValuationsClient />);
    const city = await screen.findByLabelText("Cidade") as HTMLSelectElement;
    const neighborhood = await screen.findByLabelText("Bairro") as HTMLSelectElement;
    await waitFor(() => expect(city.options.length).toBeGreaterThan(0));
    await waitFor(() => expect(neighborhood.options.length).toBeGreaterThan(0));
    fireEvent.change(city, { target: { value: "Jaraguá do Sul" } });
    await waitFor(() => expect(neighborhood).toBeEnabled());
    fireEvent.change(neighborhood, { target: { value: "Centro" } });
    fireEvent.click(screen.getByRole("button", { name: /buscar comparáveis/i }));
    expect(await screen.findByText("Revisão de comparáveis")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Locação" }));
    expect(screen.queryByText("Revisão de comparáveis")).not.toBeInTheDocument();
    expect(valuationService.createValuation).not.toHaveBeenCalled();
  });

  it("keeps exactly one purpose selected and resets new valuations to sale", async () => {
    vi.mocked(valuationService.getValuations).mockResolvedValue(paginated([calculatedValuation]));
    render(<ValuationsClient />);

    expect(await screen.findByRole("radiogroup", { name: "Finalidade" })).toBeInTheDocument();
    const sale = screen.getByRole("radio", { name: "Venda" });
    const rent = screen.getByRole("radio", { name: "Locação" });
    expect(sale).toBeChecked();
    expect(rent).not.toBeChecked();

    for (const option of [rent, rent, sale, sale, rent]) {
      fireEvent.click(option);
      expect(option).toBeChecked();
      expect(screen.getAllByRole("radio", { checked: true })).toHaveLength(1);
      expect(option).toHaveAttribute("data-state", "on");
    }

    // Changing the form purpose must not reformat an already saved result.
    expect(screen.getAllByText("R$ 504.000,00").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Nova avaliação" }));
    expect(sale).toBeChecked();
    expect(rent).not.toBeChecked();
    expect(valuationService.getValuationCandidates).not.toHaveBeenCalled();
    expect(valuationService.createValuation).not.toHaveBeenCalled();
  });

  it("updates form copy while preserving the purpose and numeric amounts of saved results", async () => {
    const rental: Valuation = {
      ...calculatedValuation,
      id: 4,
      code: "AVL-2026-000004",
      purpose: "rent",
      purpose_label: "Locação mensal",
      final_range: {
        min: 1000,
        central: 3500,
        max: 650000.5,
        display: { min: "old min", central: "old central", max: "old max" },
      },
      comparable_evidence: [{ ...calculatedValuation.comparable_evidence[0], price: 3500, price_per_square_meter: 35 }],
    };
    vi.mocked(valuationService.getValuations).mockResolvedValue(paginated([rental, calculatedValuation]));
    render(<ValuationsClient />);

    expect(await screen.findByText("AVL-2026-000004 - Locação mensal - Calculada")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Avaliação de venda" })).toBeInTheDocument();
    expect(screen.getByText("Valor estimado de locação")).toBeInTheDocument();
    expect(screen.getByText("R$ 1.000,00/mês")).toBeInTheDocument();
    expect(screen.getAllByText("R$ 3.500,00/mês")).toHaveLength(3);
    expect(screen.getByText("R$ 650.000,50/mês")).toBeInTheDocument();
    expect(screen.getByText("R$ 35,00/mês")).toBeInTheDocument();
    expect(screen.getByText("R$ 504.000,00")).toBeInTheDocument();
    expect(screen.queryByText("old central")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "Locação" }));
    expect(screen.getByRole("heading", { name: "Avaliação de locação" })).toBeInTheDocument();
    expect(screen.getByText(/Estime o aluguel mensal/)).toBeInTheDocument();
    expect(screen.getByText(/sem condomínio, IPTU/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Venda" }));
    expect(screen.getByRole("heading", { name: "Avaliação de venda" })).toBeInTheDocument();
    expect(screen.getByText(/Estime o valor de venda/)).toBeInTheDocument();
    expect(screen.getByText("Valor estimado de locação")).toBeInTheDocument();
    expect(screen.getAllByText("R$ 3.500,00/mês")).toHaveLength(3);
    expect(valuationService.createValuation).not.toHaveBeenCalled();
  });

  it("blocks the valuation surface for users without valuation permissions", async () => {
    useAuthStore.getState().setUser({
      id: 1,
      name: "Corretor",
      email: "corretor@example.com",
      is_platform_admin: false,
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

    expect(await screen.findByText("AVL-2026-000002 - Venda - Calculada")).toBeInTheDocument();
    expect(screen.getAllByText("R$ 504.000,00").length).toBeGreaterThan(0);
    expect(screen.getByText(/ajuste aplicado: -30% por risco de enchente/i)).toBeInTheDocument();
    expect(screen.getByText("Imobiliária Teste")).toBeInTheDocument();
    expect(screen.getByText("R$ 6.000,00")).toBeInTheDocument();

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

    expect(await screen.findByText("AVL-2026-000003 - Venda - Amostra insuficiente")).toBeInTheDocument();
    expect(screen.getByLabelText("Risco de enchente")).toBeInTheDocument();
    expect(screen.getAllByText(insufficientValuation.calculation_summary).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /baixar pdf/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /baixar word/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /exportar excel/i })).not.toBeInTheDocument();
  });
});
