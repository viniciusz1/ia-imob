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
