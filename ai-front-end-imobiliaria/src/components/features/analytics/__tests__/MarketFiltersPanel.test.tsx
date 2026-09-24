import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MarketFiltersPanel } from "../MarketFiltersPanel";
import { EMPTY_FILTERS } from "../useMarketAnalyticsFilters";
import { getMarketPropertyFilters } from "@/services/marketPropertyService";

vi.mock("@/services/marketPropertyService", () => ({
  getMarketPropertyFilters: vi.fn(),
}));

const PRIMARY = ["Cidade", "Tipo de imóvel", "Preço", "Bairro"];
const SECONDARY = ["Área", "Período das coletas", "Imobiliária", "Quartos", "Vagas"];

function renderPanel(filters = EMPTY_FILTERS) {
  const onChange = vi.fn();
  render(<MarketFiltersPanel filters={filters} onChange={onChange} />);

  return onChange;
}

describe("MarketFiltersPanel", () => {
  beforeEach(() => {
    vi.mocked(getMarketPropertyFilters).mockResolvedValue({
      tipos: ["Casa"],
      bairros: ["Centro"],
      bairros_por_cidade: {},
      cidades: ["Jaraguá do Sul"],
      imobiliarias: ["ITAIVAN"],
      quartos: [],
      suites: [],
      banheiros: [],
      vagas: [],
    });
  });

  it("shows only the four everyday filters up front", async () => {
    renderPanel();

    await waitFor(() => expect(screen.getByText("Cidade")).toBeInTheDocument());

    for (const label of PRIMARY) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    for (const label of SECONDARY) {
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    }
  });

  it("reveals the remaining filters on demand", async () => {
    renderPanel();

    await waitFor(() => expect(screen.getByText("Cidade")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /Mais filtros/ }));

    for (const label of SECONDARY) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("flags how many hidden filters are active so none is applied invisibly", async () => {
    renderPanel({ ...EMPTY_FILTERS, area_min: "50", quartos: [3] });

    await waitFor(() => expect(screen.getByText("Cidade")).toBeInTheDocument());

    expect(screen.getByRole("button", { name: /Mais filtros \(2\)/ })).toBeInTheDocument();
  });

  it("offers to clear only once a filter is active", async () => {
    renderPanel();

    await waitFor(() => expect(screen.getByText("Cidade")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Limpar filtros" })).not.toBeInTheDocument();
  });

  it("clears every filter, hidden ones included", async () => {
    const onChange = renderPanel({ ...EMPTY_FILTERS, cidade: "Jaraguá do Sul", quartos: [3] });

    await waitFor(() => expect(screen.getByText("Cidade")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));

    expect(onChange).toHaveBeenCalledWith(EMPTY_FILTERS);
  });
});
