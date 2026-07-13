import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OfferMapClient } from "../OfferMapClient";
import * as offerMapService from "@/services/offerMapService";
import type { OfferMapResponse } from "@/types/offerMap";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/services/offerMapService", () => ({
  getOfferMap: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/mapa-de-oferta",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

const mockResponse: OfferMapResponse = {
  city: "Jaraguá do Sul",
  total_count: 2,
  neighborhoods: [
    {
      name: "Centro",
      original_name: "Centro",
      count: 1,
      city_share_percent: 50,
      predominant_type: "Casa",
      predominant_price_range: "R$ 200 mil - 400 mil",
      median_price: 300000,
      p25_price: 300000,
      p75_price: 300000,
      typical_bedrooms: 2,
      typical_garage_spaces: 1,
      typical_area: 80,
      concentration: null,
      sample_size: 1,
      listings: [
        {
          id: 1,
          tipo: "Casa",
          imobiliaria: "Imobiliária Teste",
          valor: 300000,
          bairro: "Centro",
          cidade: "Jaraguá do Sul",
          quartos: 2,
          vagas: 1,
          area: 80,
          link: "https://example.com/1",
          imagem: null,
        },
      ],
    },
    {
      name: "Vila Lenzi",
      original_name: "Vila Lenzi",
      count: 1,
      city_share_percent: 50,
      predominant_type: "Apartamento",
      predominant_price_range: "R$ 400 mil - 600 mil",
      median_price: 500000,
      p25_price: 500000,
      p75_price: 500000,
      typical_bedrooms: 3,
      typical_garage_spaces: 2,
      typical_area: 90,
      concentration: null,
      sample_size: 1,
      listings: [
        {
          id: 2,
          tipo: "Apartamento",
          imobiliaria: "Imobiliária Teste",
          valor: 500000,
          bairro: "Vila Lenzi",
          cidade: "Jaraguá do Sul",
          quartos: 3,
          vagas: 2,
          area: 90,
          link: "https://example.com/2",
          imagem: null,
        },
      ],
    },
  ],
  unmapped_listings: [],
  price_ranges: [
    { label: "Até R$ 200 mil", min: null, max: 200000 },
    { label: "R$ 200 mil - 400 mil", min: 200000, max: 400000 },
  ],
  data_date: "2026-07-13T00:00:00.000Z",
  sources: ["source-a"],
  filters: {},
};

function renderClient() {
  return render(<OfferMapClient />);
}

describe("OfferMapClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(offerMapService.getOfferMap).mockResolvedValue(mockResponse);
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("renders initial empty state when no city is selected", async () => {
    vi.mocked(offerMapService.getOfferMap).mockRejectedValue(new Error("no city"));

    renderClient();

    await waitFor(() => {
      expect(
        screen.getByText(/selecione uma cidade para visualizar o mapa de oferta/i),
      ).toBeInTheDocument();
    });
  });

  it("loads and displays neighborhoods after selecting a city", async () => {
    renderClient();

    const cityInput = screen.getByPlaceholderText(/ex: jaraguá do sul/i);
    fireEvent.change(cityInput, { target: { value: "Jaraguá do Sul" } });

    await waitFor(() => {
      expect(offerMapService.getOfferMap).toHaveBeenCalledWith(
        expect.objectContaining({ city: "Jaraguá do Sul" }),
        "stock",
        undefined,
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/centro/i)).toBeInTheDocument();
      expect(screen.getByText(/vila lenzi/i)).toBeInTheDocument();
    });
  });

  it("allows switching layers", async () => {
    renderClient();

    const cityInput = screen.getByPlaceholderText(/ex: jaraguá do sul/i);
    fireEvent.change(cityInput, { target: { value: "Jaraguá do Sul" } });

    await waitFor(() => {
      expect(screen.getByText(/centro/i)).toBeInTheDocument();
    });

    const layerSelect = screen.getByText(/quantidade de estoque/i);
    fireEvent.click(layerSelect);

    const typeOption = screen.getByText(/tipologia predominante/i);
    fireEvent.click(typeOption);

    await waitFor(() => {
      expect(offerMapService.getOfferMap).toHaveBeenLastCalledWith(
        expect.anything(),
        "type",
        undefined,
      );
    });
  });

  it("selects a neighborhood and shows the panel", async () => {
    renderClient();

    const cityInput = screen.getByPlaceholderText(/ex: jaraguá do sul/i);
    fireEvent.change(cityInput, { target: { value: "Jaraguá do Sul" } });

    await waitFor(() => {
      expect(screen.getByText(/centro/i)).toBeInTheDocument();
    });

    const selectButtons = screen.getAllByRole("button", { name: /selecionar/i });
    fireEvent.click(selectButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/perfil típico/i)).toBeInTheDocument();
      expect(screen.getByText(/2 quartos, 1 vagas, 80 m²/i)).toBeInTheDocument();
    });
  });

  it("allows comparing up to three neighborhoods", async () => {
    renderClient();

    const cityInput = screen.getByPlaceholderText(/ex: jaraguá do sul/i);
    fireEvent.change(cityInput, { target: { value: "Jaraguá do Sul" } });

    await waitFor(() => {
      expect(screen.getByText(/centro/i)).toBeInTheDocument();
    });

    const selectButtons = screen.getAllByRole("button", { name: /selecionar/i });
    fireEvent.click(selectButtons[0]);
    fireEvent.click(selectButtons[1]);

    await waitFor(() => {
      expect(screen.getByText(/comparar bairros/i)).toBeInTheDocument();
    });
  });
});
