export interface AiSearcherProperty {
  id: number;
  image: string;
  tipo: string;
  preco: number;
  bairro: string;
  cidade: string;
  imobiliaria: string;
  quartos: number;
  areaPrivativa: number;
  descricao: string;
  link_imovel: string;
}

export interface AiSearcherFiltersState {
  selectedTipos: string[];
  selectedBairros: string[];
  selectedCidades: string[];
  selectedImobiliarias: string[];
  selectedQuartos: number[];
  minPrice: string;
  maxPrice: string;
}
