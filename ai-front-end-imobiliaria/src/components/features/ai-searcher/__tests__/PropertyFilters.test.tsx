import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PropertyFilters } from "../PropertyFilters";
import type { AiSearcherFiltersState } from "../types";
import api from "@/services/api";
import { getMarketPropertyFilters } from "@/services/marketPropertyService";

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
      imobiliarias: [],
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

    expect(await screen.findByLabelText("Amizade")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Araquari"));

    await waitFor(() => {
      expect(screen.queryByLabelText("Amizade")).not.toBeInTheDocument();
    });
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

    fireEvent.click(await screen.findByLabelText("Ascurra"));
    fireEvent.click(screen.getByLabelText("Amizade"));
    fireEvent.click(screen.getByLabelText("Araquari"));
    fireEvent.click(screen.getByLabelText("Ascurra"));
    fireEvent.click(screen.getByRole("button", { name: "Buscar imóveis" }));

    expect(onFilterStateChange).toHaveBeenCalledWith(expect.objectContaining({
      selectedCidades: ["Araquari"],
      selectedBairros: [],
    }));
  });
});
