# Plano de Arquitetura: Escalabilidade da Busca por IA de Imóveis

## 1. Visão Geral

A busca por IA atual (`AiSearchController` → `AiPropertySearchService` → `ScrapyProperty::scopeApplyFilters`) usa um pipeline **slot-filling**: o LLM (DeepSeek) extrai um JSON estruturado do prompt em linguagem natural, esse JSON é traduzido em cláusulas `WHERE`/`ILIKE` no Postgres, e há um mecanismo de relaxamento progressivo quando o resultado vem vazio.

O modelo funciona bem para uma cidade (Jaraguá do Sul) com catálogo curado em `config/proximity.php`, mas tem **seis gargalos** que impedem escalar para outras cidades sem dobrar o esforço de curadoria humana, e que limitam a qualidade da busca por IA:

| # | Gargalo | Impacto |
|---|---------|---------|
| 1 | LLM retorna JSON solto via prompt — sujeito a markdown, campos inventados, parse com regex | Robustez |
| 2 | Cada busca chama o LLM (latência 1–3s, custo, ponto único de falha) | Performance / Custo |
| 3 | `ILIKE '%foo%'` sem índices trigram | Escala (>500k linhas) |
| 4 | Sem coordenadas geográficas; "perto de X" é resolvido por lista fixa de bairros | Escala por cidade |
| 5 | Catálogo de POIs (`config/proximity.php`) é manual por cidade | Tempo de dev / Manutenção |
| 6 | Sem busca semântica — "aconchegante", "vista bonita", "bom pra família" não são extraíveis | Qualidade da IA |

Este documento descreve a estratégia geral. Cada item tem um plano técnico detalhado em `docs/technical-implementations/ai-search-scaling/`.

---

## 2. Princípios Norteadores

1. **Coordenadas > Listas curadas.** Substituir a curadoria de "bairros vizinhos" por geometria real (raio em km) elimina o trabalho humano linear por cidade.
2. **Híbrido > Puro.** Filtros estruturados (LLM) + similaridade semântica (embeddings) capturam tanto critérios objetivos ("3 quartos até 500 mil") quanto subjetivos ("aconchegante").
3. **LLM fora do caminho crítico sempre que possível.** Cache, modelo mais barato, structured outputs.
4. **Cada nova cidade = um script, não uma sprint.** Adicionar uma cidade deve ser: rodar import de POIs do OSM + geocodificar imóveis. Sem curadoria de aliases.

---

## 3. Os Seis Planos

### 3.1 Structured Output / Function Calling
Substituir o "LLM gera JSON em texto livre" por `response_format: json_schema` (ou tool use). Elimina o parser regex e impede o modelo de retornar campos fora do schema.
→ `technical-implementations/ai-search-scaling/01-structured-output.md`

### 3.2 Cache de Parses (Redis)
Hash de `prompt + context_city` → filtros em Redis (TTL 7d). Prompts curtos repetem; corta latência e custo.
→ `technical-implementations/ai-search-scaling/02-parse-cache.md`

### 3.3 Índices pg_trgm
Adicionar `GIN (unaccent(coluna) gin_trgm_ops)` em `bairro`, `cidade` e `descricao`. Sem isso, `ILIKE '%x%'` faz sequential scan e degrada com o volume.
→ `technical-implementations/ai-search-scaling/03-pg-trgm-indexes.md`

### 3.4 Geocodificação + PostGIS
Adicionar `lat`/`lng` (e coluna `geom` PostGIS) em `scrapy-properties`. Permite busca por raio real (`ST_DWithin`) e ranqueamento por distância. Pré-requisito do plano 3.5.
→ `technical-implementations/ai-search-scaling/04-geocoding-postgis.md`

### 3.5 Import de POIs via OpenStreetMap
Tabela `points_of_interest` populada via Overpass API. POIs (escolas, hospitais, shoppings, indústrias) viram rows com `(nome, lat, lng, cidade, categoria)`. "Perto da WEG" passa a ser `ST_DWithin(property.geom, weg.geom, 2km)` — zero curadoria manual.
→ `technical-implementations/ai-search-scaling/05-osm-poi-import.md`

### 3.6 Embeddings + pgvector Híbrido
Gerar um embedding por imóvel (`text-embedding-3-small`) sobre `tipo + bairro + descricao + comodidades`. Na busca, fazer **híbrido**: filtros estruturados (LLM) ∩ top-K por similaridade. Resolve termos subjetivos.
→ `technical-implementations/ai-search-scaling/06-pgvector-hybrid.md`

---

## 4. Roadmap de Execução

| Fase | Item | Esforço | Risco | Destrava |
|------|------|---------|-------|----------|
| **Sprint 1** | 3.1 Structured output | 1 dia | Baixo | Robustez imediata |
| **Sprint 1** | 3.2 Cache de parses | 0,5 dia | Baixo | -50% latência/custo |
| **Sprint 1** | 3.3 Índices pg_trgm | 1h | Baixo | Performance |
| **Sprint 2–3** | 3.4 Geocoding + PostGIS | 1–2 semanas | Médio | Desbloqueia 3.5 |
| **Sprint 4** | 3.5 OSM POIs | 3–5 dias | Médio | Escala por cidade |
| **Sprint 5–6** | 3.6 pgvector híbrido | 1 semana | Médio-Alto | Qualidade semântica |

**Total estimado:** 4–6 semanas para a transformação completa, com ganhos incrementais a cada fase (não precisa esperar tudo pronto pra entregar valor).

---

## 5. Critérios de Sucesso

- **Adicionar uma cidade** (ex: Blumenau) leva ≤ 1 dia, sem editar `config/proximity.php`.
- **p95 de latência** da busca por IA ≤ 800ms (hoje: ~1.5–3s).
- **Taxa de "0 resultados"** cai (medida antes/depois) — buscas semânticas como "imóvel com cara de chácara" passam a retornar algo relevante.
- `config/proximity.php` **deletado** ao fim do plano 3.5.

---

## 6. Riscos e Mitigações

- **Geocodificação falha em endereços incompletos.** Mitigação: fallback para geocodificar `bairro + cidade` (centroide do bairro) com flag `geocode_quality`.
- **Custo de embeddings.** Mitigação: gerar apenas no momento de inserir/atualizar imóvel; `text-embedding-3-small` custa ~$0.02 / 1M tokens — desprezível na escala atual.
- **Drift do LLM com structured output.** Mitigação: validar com Laravel Validator antes de usar; logar respostas inválidas.
- **OSM tem cobertura desigual.** Mitigação: permitir cadastro manual de POI no admin como exceção; OSM cobre o essencial.

---

## 7. O Que **Não** Vamos Mudar

- Separação Controller / Service / Scope — está adequada.
- Fallback progressivo (`buildSearchAttempts`) — abordagem correta, manter.
- Normalização de aliases via `slug()` — vai sumir naturalmente quando os planos 3.4 e 3.5 estiverem prontos; não vale refatorar antes.
