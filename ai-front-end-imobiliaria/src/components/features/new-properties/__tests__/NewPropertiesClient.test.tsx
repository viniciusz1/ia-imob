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
  history_window_start: "2026-07-28T12:00:00-03:00",
  history_snapshot_count: 4,
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
  bairro: "América",
  cidade: "Blumenau",
  preco: 620000,
  area: 155,
  quartos: 4,
  banheiros: 3,
  vagas: 2,
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
        window_days: 30,
        window_start: "2026-07-28T12:00:00-03:00",
        window_end: "2026-08-27T12:00:00-03:00",
        snapshot_count: 4,
        snapshot_ids: [70, 76, 82, 88],
        observed_identity_count: 135,
        identity_strategy: "listing_identity",
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

const insufficientResponse: NewPropertiesResponse = {
  data: [
    {
      crawl_agency: { id: 8, name: "Imobiliária Sem Histórico" },
      snapshot: { id: 92, published_at: "2026-08-27T13:00:00-03:00" },
      counts: { total: 1, new: 0, opportunities: 1 },
      history: {
        status: "insufficient",
        window_days: 30,
        window_start: "2026-07-28T13:00:00-03:00",
        window_end: "2026-08-27T13:00:00-03:00",
        snapshot_count: 0,
        snapshot_ids: [],
        observed_identity_count: 0,
        identity_strategy: "listing_identity",
      },
      properties: [
        {
          ...opportunityProperty,
          id: 12,
          title: "Casa no primeiro snapshot",
          is_new: false,
          new_reason: "insufficient_history",
          history_window_start: "2026-07-28T13:00:00-03:00",
          history_snapshot_count: 0,
        },
      ],
    },
  ],
  meta: {
    updated_at: "2026-08-27T13:00:00-03:00",
    total: 1,
    total_new: 0,
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

  it("shows a customer-friendly showcase grouped by real-estate agency", async () => {
    vi.mocked(getNewProperties).mockResolvedValue(response);

    renderClient();

    expect(await screen.findByText("Seu radar imobiliário")).toBeInTheDocument();
    expect(screen.getByText("Descubra imóveis recém-encontrados e oportunidades que combinam com a sua busca.")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Imobiliária Exemplo" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Apartamento novo no Centro" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Casa com bom custo-benefício" })).toBeInTheDocument();
    expect(screen.getByText("Score 80/100")).toBeInTheDocument();
    expect(screen.getByText(/20% abaixo da referência de imóveis parecidos/i)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /ver anúncio original/i })).toHaveLength(2);
  });

  it("keeps technical history details out of the customer-facing screen", async () => {
    vi.mocked(getNewProperties).mockResolvedValue(response);

    renderClient();

    await screen.findByRole("heading", { name: "Apartamento novo no Centro" });

    expect(screen.queryByText(/Snapshot atual/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Histórico suficiente/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/identidade estável/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Por que é novo?")).not.toBeInTheDocument();
    expect(screen.queryByText(/atualizado em/i)).not.toBeInTheDocument();
  });

  it("uses a friendly message when there is not enough history for new listings", async () => {
    vi.mocked(getNewProperties).mockResolvedValue(insufficientResponse);

    renderClient();

    expect(await screen.findByText("Novidades ainda não disponíveis")).toBeInTheDocument();
    expect(screen.getByText(/ainda precisa de mais informações para indicar novidades com segurança/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Casa no primeiro snapshot" })).toBeInTheDocument();
    expect(screen.queryByText(/^Novo$/)).not.toBeInTheDocument();
  });

  it("hides an agency completely when it has no properties to show", async () => {
    vi.mocked(getNewProperties).mockResolvedValue({
      ...insufficientResponse,
      data: [{ ...insufficientResponse.data[0], properties: [] }],
      meta: { ...insufficientResponse.meta, total: 0, total_opportunities: 0 },
    });

    renderClient();

    expect(await screen.findByRole("heading", { name: "Nenhum imóvel encontrado" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Imobiliária Sem Histórico" })).not.toBeInTheDocument();
    expect(screen.queryByText("Novidades ainda não disponíveis")).not.toBeInTheDocument();
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

  it("searches listings and applies the main property filters", async () => {
    vi.mocked(getNewProperties).mockResolvedValue(response);

    renderClient();
    await screen.findByRole("heading", { name: "Apartamento novo no Centro" });

    fireEvent.change(screen.getByRole("textbox", { name: "Buscar imóveis" }), {
      target: { value: "centro" },
    });

    expect(screen.getByRole("heading", { name: "Apartamento novo no Centro" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Casa com bom custo-benefício" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /limpar filtros/i }));
    fireEvent.click(screen.getByRole("combobox", { name: "Filtrar por quartos" }));
    fireEvent.click(await screen.findByRole("option", { name: "3 quartos" }));

    expect(screen.queryByRole("heading", { name: "Apartamento novo no Centro" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Casa com bom custo-benefício" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /limpar filtros/i }));
    fireEvent.click(screen.getByRole("combobox", { name: "Filtrar por quartos" }));
    fireEvent.click(await screen.findByRole("option", { name: "4 quartos" }));

    expect(screen.queryByRole("heading", { name: "Apartamento novo no Centro" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Casa com bom custo-benefício" })).toBeInTheDocument();
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
