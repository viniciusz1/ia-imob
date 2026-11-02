import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NewPropertiesClient } from "../NewPropertiesClient";
import { getNewProperties } from "@/services/newPropertiesService";
import type {
  NewPropertiesParams,
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
  identified_at: "2026-08-27T12:00:00-03:00",
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
    filtered_total: 2,
    filters: {
      agencies: [{ id: 7, name: "Imobiliária Exemplo" }],
      cities: ["Joinville", "Blumenau"],
      neighborhoods: ["Centro", "América"],
      types: ["Apartamento", "Casa"],
      purposes: ["venda"],
    },
    pagination: { page: 1, per_page: 24, total: 2, last_page: 1, has_more: false },
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
    ...response.meta,
    updated_at: "2026-08-27T13:00:00-03:00",
    total: 1,
    total_new: 0,
    total_opportunities: 1,
  },
};

function filteredResponse(params: NewPropertiesParams = {}): NewPropertiesResponse {
  const properties = response.data[0].properties.filter((property) => {
    if (params.flag === "new" && !property.is_new) return false;
    if (params.flag === "opportunity" && !property.is_opportunity) return false;
    if (params.search && !property.title?.toLowerCase().includes(params.search.toLowerCase())) return false;
    if (params.bedrooms && property.quartos !== Number(params.bedrooms)) return false;
    if (params.type && property.tipo !== params.type) return false;
    return true;
  });

  return {
    ...response,
    data: properties.length ? [{ ...response.data[0], properties }] : [],
    meta: {
      ...response.meta,
      filtered_total: properties.length,
      pagination: { ...response.meta.pagination, total: properties.length },
    },
  };
}

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

  it("keeps the insufficient history state out of the customer-facing screen", async () => {
    vi.mocked(getNewProperties).mockResolvedValue(insufficientResponse);

    renderClient();

    expect(await screen.findByRole("heading", { name: "Casa no primeiro snapshot" })).toBeInTheDocument();
    expect(screen.queryByText(/^Novo$/)).not.toBeInTheDocument();
    expect(screen.queryByText("Novidades ainda não disponíveis")).not.toBeInTheDocument();
    expect(screen.queryByText(/ainda precisa de mais informações para indicar novidades com segurança/i)).not.toBeInTheDocument();
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
    vi.mocked(getNewProperties).mockImplementation(async (params) => filteredResponse(params));

    renderClient();
    await screen.findByRole("heading", { name: "Apartamento novo no Centro" });

    fireEvent.click(screen.getByRole("button", { name: "Oportunidades" }));

    await waitFor(() => expect(getNewProperties).toHaveBeenLastCalledWith(expect.objectContaining({ flag: "opportunity" })));
    expect(await screen.findByRole("heading", { name: "Casa com bom custo-benefício" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Apartamento novo no Centro" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Imobiliária Exemplo" })).toBeInTheDocument();
  });

  it("moves between server pages without repeating the previous cards", async () => {
    vi.mocked(getNewProperties).mockImplementation(async (params) => ({
      ...response,
      data: [{
        ...response.data[0],
        properties: [params?.page === 2 ? opportunityProperty : newProperty],
      }],
      meta: {
        ...response.meta,
        pagination: {
          page: params?.page ?? 1,
          per_page: 1,
          total: 2,
          last_page: 2,
          has_more: params?.page !== 2,
        },
      },
    }));

    renderClient();
    expect(await screen.findByRole("heading", { name: "Apartamento novo no Centro" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Próxima" }));
    await waitFor(() => expect(getNewProperties).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));
    expect(await screen.findByRole("heading", { name: "Casa com bom custo-benefício" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Apartamento novo no Centro" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Anterior" }));
    expect(await screen.findByRole("heading", { name: "Apartamento novo no Centro" })).toBeInTheDocument();
  });

  it("searches listings and applies the main property filters", async () => {
    vi.mocked(getNewProperties).mockImplementation(async (params) => filteredResponse(params));

    renderClient();
    await screen.findByRole("heading", { name: "Apartamento novo no Centro" });

    fireEvent.change(screen.getByRole("textbox", { name: "Buscar imóveis" }), {
      target: { value: "centro" },
    });

    await waitFor(() => expect(getNewProperties).toHaveBeenLastCalledWith(expect.objectContaining({ search: "centro" })));
    expect(await screen.findByRole("heading", { name: "Apartamento novo no Centro" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /limpar filtros/i }));
    fireEvent.click(screen.getByRole("combobox", { name: "Filtrar por quartos" }));
    fireEvent.click(await screen.findByRole("option", { name: "3 quartos" }));

    await waitFor(() => expect(getNewProperties).toHaveBeenLastCalledWith(expect.objectContaining({ bedrooms: "3" })));
    expect(await screen.findByRole("heading", { name: "Nenhum imóvel encontrado" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /limpar filtros/i }));
    fireEvent.click(screen.getByRole("combobox", { name: "Filtrar por quartos" }));
    fireEvent.click(await screen.findByRole("option", { name: "4 quartos" }));

    await waitFor(() => expect(getNewProperties).toHaveBeenLastCalledWith(expect.objectContaining({ bedrooms: "4" })));
    expect(await screen.findByRole("heading", { name: "Casa com bom custo-benefício" })).toBeInTheDocument();
  }, 15_000);

  it.each([
    ["Filtrar por imobiliária", "Imobiliária Exemplo", { agency_id: 7 }],
    ["Filtrar por tipo", "Casa", { type: "Casa" }],
    ["Filtrar por cidade", "Blumenau", { city: "Blumenau" }],
    ["Filtrar por bairro", "América", { neighborhood: "América" }],
    ["Filtrar por finalidade", "Venda", { purpose: "venda" }],
    ["Filtrar por banheiros", "2 banheiros", { bathrooms: "2" }],
    ["Filtrar por vagas", "5+ vagas", { parking: "5+" }],
    ["Ordenar imóveis", "Melhor oportunidade", { sort: "opportunity_desc" }],
  ])("sends %s to the API and returns to the first page", async (label, option, expected) => {
    vi.mocked(getNewProperties).mockImplementation(async (params) => ({
      ...response,
      meta: {
        ...response.meta,
        pagination: { page: params?.page ?? 1, per_page: 24, total: 48, last_page: 2, has_more: params?.page !== 2 },
      },
    }));

    renderClient();
    fireEvent.click(await screen.findByRole("button", { name: "Próxima" }));
    await waitFor(() => expect(getNewProperties).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));

    fireEvent.click(await screen.findByRole("combobox", { name: label }));
    fireEvent.click(await screen.findByRole("option", { name: option }));

    await waitFor(() => expect(getNewProperties).toHaveBeenLastCalledWith(expect.objectContaining({ ...expected, page: 1 })));
  }, 15_000);

  it("restores every listing when the applied filters are cleared", async () => {
    vi.mocked(getNewProperties).mockImplementation(async (params) => filteredResponse(params));

    renderClient();
    fireEvent.click(await screen.findByRole("combobox", { name: "Filtrar por tipo" }));
    fireEvent.click(await screen.findByRole("option", { name: "Casa" }));
    await waitFor(() => expect(getNewProperties).toHaveBeenLastCalledWith(expect.objectContaining({ type: "Casa" })));
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Apartamento novo no Centro" })).not.toBeInTheDocument());

    fireEvent.click(await screen.findByRole("button", { name: /limpar filtros/i }));

    expect(await screen.findByRole("heading", { name: "Apartamento novo no Centro" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Filtrar por tipo" })).toHaveTextContent("Todos os tipos");
    expect(screen.queryByRole("button", { name: /limpar filtros/i })).not.toBeInTheDocument();
  }, 15_000);

  it("keeps a listing readable when the source did not provide its details", async () => {
    vi.mocked(getNewProperties).mockResolvedValue({
      ...response,
      data: [{
        ...response.data[0],
        properties: [{
          ...newProperty,
          image: "",
          title: null,
          purpose: null,
          tipo: "",
          preco: 0,
          bairro: "",
          cidade: "",
          quartos: 0,
          suites: 0,
          banheiros: 0,
          vagas: 0,
          area: 0,
          descricao: "",
          link_imovel: "",
          opportunity_reason: "missing_price_or_area",
          price_per_square_meter: null,
          benchmark_price_per_square_meter: null,
          price_advantage_percentage: null,
          comparable_count: 0,
          sample_size_indicator: null,
        }],
      }],
    });

    renderClient();

    expect(await screen.findByRole("heading", { name: "Imóvel" })).toBeInTheDocument();
    expect(screen.getByText("Imóvel sem imagem")).toBeInTheDocument();
    expect(screen.getByText("Preço não informado")).toBeInTheDocument();
    expect(screen.getByText("Localização não informada")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anúncio original indisponível" })).toBeDisabled();
    expect(screen.queryByText(/\/m²/)).not.toBeInTheDocument();
    expect(screen.queryByText("Boa oportunidade")).not.toBeInTheDocument();
  });

  it("shows the empty state when there are no classified properties", async () => {
    vi.mocked(getNewProperties).mockResolvedValue({
      data: [],
      meta: {
        ...response.meta,
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

  it("explains that access is denied instead of suggesting a connection problem", async () => {
    vi.mocked(getNewProperties).mockRejectedValue(
      Object.assign(new AxiosError("forbidden"), { response: { status: 403 } }),
    );

    renderClient();

    expect(await screen.findByRole("heading", { name: "Você não tem acesso a esta tela" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Tentar novamente" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Verifique a conexão/i)).not.toBeInTheDocument();
  });
});
