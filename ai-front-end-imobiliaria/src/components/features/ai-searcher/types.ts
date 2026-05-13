export interface AiSearcherProperty {
  id: number;
  image: string;
  tipo: string;
  preco: number;
  bairro: string;
  cidade: string;
  imobiliaria: string;
  quartos: number;
  suites: number;
  banheiros: number;
  vagas: number;
  area: number;
  descricao: string;
  link_imovel: string;
  piscina: boolean;
  churrasqueira: boolean;
  academia: boolean;
  salao_festas: boolean;
  playground: boolean;
  sacada: boolean;
  mobiliado: boolean;
  ar_condicionado: boolean;
  lavanderia: boolean;
  escritorio: boolean;
  closet: boolean;
  elevador: boolean;
  portaria_24h: boolean;
  aceita_permuta: boolean;
  financiamento: boolean;
  andar: string;
  posicao_solar: string;
  ano_construcao: number;
}

export interface AiSearcherFiltersState {
  selectedTipos: string[];
  selectedBairros: string[];
  selectedCidades: string[];
  selectedImobiliarias: string[];
  selectedQuartos: number[];
  selectedQuartosPlus: boolean;
  selectedSuites: number[];
  selectedSuitesPlus: boolean;
  selectedBanheiros: number[];
  selectedBanheirosPlus: boolean;
  selectedVagas: number[];
  selectedVagasPlus: boolean;
  selectedComodidades: string[];
  descricao: string;
  minPrice: string;
  maxPrice: string;
}

export interface AiSearcherFiltersOptions {
  tipos: string[];
  bairros: string[];
  cidades: string[];
  imobiliarias: string[];
  quartos: number[];
  suites: number[];
  banheiros: number[];
  vagas: number[];
}

export interface SavedFilter {
  id: string;
  name: string;
  filters: AiSearcherFiltersState;
  createdAt: string;
}

export type SearchMode = "ai" | "conventional";
export type SortMode = "newest" | "price_asc" | "price_desc" | "area_asc" | "area_desc";

export interface AiSearchResponse {
  filters: Record<string, unknown>;
  data: AiSearcherProperty[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    approximate?: boolean;
    relaxed?: string[];
    sort?: SortMode;
  };
}

export interface AiParsedFilter {
  key: string;
  label: string;
  value: string;
}
