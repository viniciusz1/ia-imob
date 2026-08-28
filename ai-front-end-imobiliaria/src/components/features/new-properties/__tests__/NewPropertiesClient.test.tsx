import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NewPropertiesClient } from "../NewPropertiesClient";
import { getNewProperties } from "@/services/newPropertiesService";
import type {
  NewPropertiesResponse,
  NewPropertyItem,
} from "@/types/newProperties";

vi.mock("@/services/newPropertiesService", () => ({
  getNewProperties: vi.fn(),
}));

const newProperty: NewPropertyItem = {
  id: 10,
  image: "https://images.example.com/apartamento.jpg",
  title: "Apartamento novo no Centro",
  purpose: "venda",
  tipo: "Apartamento",
  preco: 450000,
  bairro: "Centro",
  cidade: "Joinville",
  imobiliaria: "Imobiliária Exemplo",
  quartos: 2,
  suites: 1,
  banheiros: 2,
  vagas: 1,
  area: 80,
  descricao: "Apartamento com sacada e duas vagas.",
  link_imovel: "https://imobiliaria.example.com/imovel/10",
  is_new: true,
  new_reason: "absent_in_30_day_window",
  first_seen_in_current_window_at: "2026-08-27T09:00:00-03:00",
  is_opportunity: false,
  opportunity_score: null,
  opportunity_reason: "below_opportunity_threshold",
  opportunity_explanation: "Diferença de 3% em relação à mediana.",
  price_per_square_meter: 5625,
  benchmark_price_per_square_meter: 5800,
  price_advantage_percentage: 3,
  comparable_count: 8,
  sample_size_indicator: "medium",
};

const opportunityProperty: NewPropertyItem = {
  ...newProperty,
  id: 11,
  image: "",
  title: "Casa com bom custo-benefício",
  tipo: "Casa",
  preco: 620000,
  area: 155,
  link_imovel: "https://imobiliaria.example.com/imovel/11",
  is_new: false,
  new_reason: "observed_in_window",
  first_seen_in_current_window_at: null,
  is_opportunity: true,
  opportunity_score: 80,
  opportunity_reason: "below_opportunity_threshold",
  opportunity_explanation: "20% abaixo da mediana de 9 imóveis comparáveis",
  price_per_square_meter: 4000,
  benchmark_price_per_square_meter: 5000,
  price_advantage_percentage: 20,
  comparable_count: 9,
  sample_size_indicator: "medium",
};

const response: NewPropertiesResponse = {
  data: [
    {
      crawl_agency: { id: 7, name: "Imobiliária Exemplo" },
      snapshot: { id: 91, published_at: "2026-08-27T12:00:00-03:00" },
      counts: { total: 2, new: 1, opportunities: 1 },
      history: {
        status: "sufficient",
        snapshot_count: 4,
        window_start: "2026-07-28T12:00:00-03:00",
      },
      properties: [newProperty, opportunityProperty],
    },
  ],
  meta: {
    updated_at: "2026-08-27T12:00:00-03:00",
    total: 2,
    total_new: 1,
    total_opportunities: 1,
  },
};

function renderClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <NewPropertiesClient />
    </QueryClientProvider>,
  );
}

describe("NewPropertiesClient", () => {
  beforeEach(() => {
    vi.mocked(getNewProperties).mockReset();
  });

  it("groups cards by Crawl Agency and displays both classifications", async () => {
    vi.mocked(getNewProperties).mockResolvedValue(response);

    renderClient();

    expect(await screen.findByRole("heading", { name: "Imobiliária Exemplo" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Apartamento novo no Centro" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Casa com bom custo-benefício" })).toBeInTheDocument();
    expect(screen.getByText("Score 80/100")).toBeInTheDocument();
    expect(screen.getByText(/20% abaixo da mediana de 9 imóveis comparáveis/i)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /ver anúncio original/i })).toHaveLength(2);
  });

  it("filters the cards without losing their Agency grouping", async () => {
    vi.mocked(getNewProperties).mockResolvedValue(response);

    renderClient();
    await screen.findByRole("heading", { name: "Apartamento novo no Centro" });

    fireEvent.click(screen.getByRole("button", { name: "Oportunidades" }));

    expect(screen.queryByRole("heading", { name: "Apartamento novo no Centro" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Casa com bom custo-benefício" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Imobiliária Exemplo" })).toBeInTheDocument();
  });

  it("shows the empty state when there are no classified properties", async () => {
    vi.mocked(getNewProperties).mockResolvedValue({
      data: [],
      meta: {
        updated_at: null,
        total: 0,
        total_new: 0,
        total_opportunities: 0,
      },
    });

    renderClient();

    expect(await screen.findByRole("heading", { name: "Nenhum imóvel encontrado" })).toBeInTheDocument();
  });

  it("allows retrying after an API failure", async () => {
    vi.mocked(getNewProperties)
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(response);

    renderClient();

    fireEvent.click(await screen.findByRole("button", { name: "Tentar novamente" }));

    expect(await screen.findByRole("heading", { name: "Imobiliária Exemplo" })).toBeInTheDocument();
    await waitFor(() => expect(getNewProperties).toHaveBeenCalledTimes(2));
  });
});
