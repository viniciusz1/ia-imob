# Especificação Técnica (Frontend) - AI Searcher (Scrapy Properties)

## 1. Visão Geral
Este documento detalha o componente front-end (`Next.js`) projetado para o módulo **AI Searcher**. A interface possui o objetivo de consumir os imóveis cadastrados pelo scraper do back-end e prover uma busca e filtros reativos e fluídos aos usuários.

## 2. Componentes

### 2.1. Funcionalidades do `AiSearcherClient`
Localização: `src/components/features/ai-searcher/AiSearcherClient.tsx`.

- O componente deve ser um Client Component (`"use client"`).
- O estado principal utilizará ganchos (`useState`) para receber dados da API.
- Exibir os filtros interativos e permitir a paginação em tempo real utilizando parâmetros na URL (URLSearchParams).
- Sincronização e requisição de dados assíncronos (`useEffect`).

#### Fluxo de Dados:
1. O componente inicia em estado de "carregando" (`isLoading = true`).
2. Dispara a função assíncrona que executa um `api.get('/api/scrapy-properties')`.
3. Mapeia as propriedades recebidas traduzindo nomes de chaves baseadas em Snake Case e afins do Back-End para Camel Case utilizados estritamente no front-end (`qtd_quartos` -> `quartos`, `area_m2` -> `areaPrivativa`, `imagem` -> `image`, etc.).
4. O componente lida com erros de rede de forma silenciosa ou utilizando log e atualiza `isLoading` para `false` não travando a página do usuário.

### 2.2. Feedback Visual
- Incluir feedback de "Loading" usando o utilitário `.animate-pulse` do Tailwind enquanto a requisição HTTP backend processa (`Carregando imóveis da base de dados...`).
- Suportar renderização SSR contínua via o uso do `Suspense` originado pela página pai (`AiSearcherPage`).

## 3. Integração com Filtros de URL
- A lógica do `ai-searcher` delega os filtros ao `URLSearchParams`. Sempre que o usuário altera tipo do imóvel, valor mínimo ou valor máximo no slide, a função `pushSearchParams` interceptará as mudanças, atualizando a URL mas não recarregando o Server Component `page.tsx` (`{ scroll: false }`).
