import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PropertyFilters } from "../PropertyFilters";
import type { AiSearcherFiltersState } from "../types";
import api from "@/services/api";
import {
  getMarketPropertyFilters,
  type MarketPropertyFiltersResponse,
} from "@/services/marketPropertyService";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/services/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  API_PREFIX: "/api/v1",
}));

vi.mock("@/services/marketPropertyService", () => ({
  getMarketPropertyFilters: vi.fn(),
}));

const emptyState: AiSearcherFiltersState = {
  selectedTipos: [],
  selectedBairros: [],
  selectedCidades: [],
  selectedImobiliarias: [],
  selectedQuartos: [],
  selectedQuartosPlus: false,
  selectedSuites: [],
  selectedSuitesPlus: false,
  selectedBanheiros: [],
  selectedBanheirosPlus: false,
  selectedVagas: [],
  selectedVagasPlus: false,
  selectedComodidades: [],
  descricao: "",
  minPrice: "",
  maxPrice: "",
};

describe("PropertyFilters", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockResolvedValue({ data: [] });
    vi.mocked(getMarketPropertyFilters).mockResolvedValue({
      tipos: [],
      bairros: ["Amizade", "Centro", "Itinga"],
      bairros_por_cidade: {
        Araquari: ["Centro", "Itinga"],
        Ascurra: ["Amizade"],
      },
      cidades: ["Araquari", "Ascurra"],
      imobiliarias: ["Imobiliária Central"],
      quartos: [],
      suites: [],
      banheiros: [],
      vagas: [],
    });
  });

  it("shows only neighborhoods from the selected cities", async () => {
    const onFilterStateChange = vi.fn();

    render(
      <PropertyFilters
        properties={[]}
        initialState={emptyState}
        onFilterChange={vi.fn()}
        onFilterStateChange={onFilterStateChange}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: /^Cidade: Todas as cidades$/ })
    );
    fireEvent.click(await screen.findByLabelText("Araquari"));
    fireEvent.click(screen.getByRole("button", { name: "Voltar para filtros" }));
    fireEvent.click(
      screen.getByRole("button", { name: /^Bairro: Todos os bairros$/ })
    );

    expect(screen.queryByLabelText("Amizade")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Centro")).toBeInTheDocument();
    expect(screen.getByLabelText("Itinga")).toBeInTheDocument();
  });

  it("clears selected neighborhoods that do not belong to the remaining cities", async () => {
    const onFilterStateChange = vi.fn();

    render(
      <PropertyFilters
        properties={[]}
        initialState={emptyState}
        onFilterChange={vi.fn()}
        onFilterStateChange={onFilterStateChange}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: /^Cidade: Todas as cidades$/ })
    );
    fireEvent.click(await screen.findByLabelText("Ascurra"));
    fireEvent.click(screen.getByLabelText("Araquari"));
    fireEvent.click(screen.getByRole("button", { name: "Voltar para filtros" }));
    fireEvent.click(
      screen.getByRole("button", { name: /^Bairro: Todos os bairros$/ })
    );
    fireEvent.click(screen.getByLabelText("Amizade"));
    fireEvent.click(screen.getByRole("button", { name: "Voltar para filtros" }));
    fireEvent.click(
      screen.getByRole("button", { name: /^Cidade: / })
    );
    fireEvent.click(screen.getByLabelText("Ascurra"));
    fireEvent.click(screen.getByRole("button", { name: "Buscar imóveis" }));

    expect(onFilterStateChange).toHaveBeenCalledWith(expect.objectContaining({
      selectedCidades: ["Araquari"],
      selectedBairros: [],
    }));
  });

  it("places the agency filter immediately after price", async () => {
    render(
      <PropertyFilters
        properties={[]}
        initialState={emptyState}
        onFilterChange={vi.fn()}
        onFilterStateChange={vi.fn()}
      />
    );

    await act(async () => {
      await Promise.resolve();
    });

    const priceHeading = screen.getByRole("heading", { name: "Preço" });
    const agencyButton = screen.getByRole("button", {
      name: /^Imobiliária: Todas as imobiliárias$/,
    });

    expect(
      priceHeading.compareDocumentPosition(agencyButton) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("opens long option lists in the panel's only scroll area", async () => {
    render(
      <PropertyFilters
        properties={[]}
        initialState={emptyState}
        onFilterChange={vi.fn()}
        onFilterStateChange={vi.fn()}
      />
    );

    const panel = screen.getByTestId("property-filter-panel");
    const initialPanelClassName = panel.className;

    expect(panel).toHaveClass("h-[calc(100vh-6rem)]");
    expect(panel).not.toHaveClass("lg:sticky");
    expect(screen.queryByLabelText("Amizade")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /^Bairro: Todos os bairros$/ })
    );

    expect(await screen.findByLabelText("Amizade")).toBeInTheDocument();
    expect(panel.className).toBe(initialPanelClassName);
    expect(document.querySelectorAll('[class*="overflow-y-auto"]')).toHaveLength(1);
  });

  it("refetches filter options when a category changes and hides agencies without properties in the selected city", async () => {
    vi.mocked(getMarketPropertyFilters).mockImplementation(async (params): Promise<MarketPropertyFiltersResponse> => {
      if (params?.cidade?.includes("Jaraguá do Sul")) {
        return {
          tipos: ["Apartamento"],
          bairros: ["Vila Lenzi"],
          bairros_por_cidade: { "Jaraguá do Sul": ["Vila Lenzi"] },
          cidades: ["Jaraguá do Sul", "Joinville"],
          imobiliarias: ["Imobiliária Jaraguá"],
          quartos: [2],
          suites: [1],
          banheiros: [2],
          vagas: [1],
          comodidades: ["piscina"],
        };
      }

      return {
        tipos: ["Apartamento", "Casa"],
        bairros: ["América", "Vila Lenzi"],
        bairros_por_cidade: {
          "Jaraguá do Sul": ["Vila Lenzi"],
          Joinville: ["América"],
        },
        cidades: ["Jaraguá do Sul", "Joinville"],
        imobiliarias: ["Imobiliária Jaraguá", "Imobiliária Joinville"],
        quartos: [2, 4],
        suites: [1, 3],
        banheiros: [2, 4],
        vagas: [1, 3],
        comodidades: ["piscina", "churrasqueira"],
      };
    });

    const onFilterStateChange = vi.fn();

    render(
      <PropertyFilters
        properties={[]}
        initialState={{
          ...emptyState,
          selectedImobiliarias: ["Imobiliária Joinville"],
        }}
        onFilterChange={vi.fn()}
        onFilterStateChange={onFilterStateChange}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: /^Cidade: Todas as cidades$/ })
    );
    fireEvent.click(await screen.findByLabelText("Jaraguá do Sul"));
    fireEvent.click(screen.getByRole("button", { name: "Voltar para filtros" }));

    fireEvent.click(
      await screen.findByRole("button", { name: /^Imobiliária: Todas as imobiliárias$/ })
    );

    expect(await screen.findByLabelText("Imobiliária Jaraguá")).toBeInTheDocument();
    expect(screen.queryByLabelText("Imobiliária Joinville")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Voltar para filtros" }));
    fireEvent.click(
      screen.getByRole("button", { name: /^Quartos e vagas: Qualquer quantidade$/ })
    );

    expect(screen.getByLabelText("2 quartos")).toBeInTheDocument();
    expect(screen.queryByLabelText("4 quartos")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("4+ quartos")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Buscar imóveis" }));

    expect(onFilterStateChange).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedCidades: ["Jaraguá do Sul"],
        selectedImobiliarias: [],
      })
    );
  });
});
