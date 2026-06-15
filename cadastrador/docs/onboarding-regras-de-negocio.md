# Regras de Negócio do Módulo de Onboarding do Cadastrador

## 1. O que é o Onboarding

O **Onboarding** é o processo que transforma o endereço (URL) de uma imobiliária em uma configuração de extração salva no banco de dados, permitindo que o scraper (Imobscrapy) colete imóveis automaticamente.

Em termos simples: o usuário informa algo como `https://www.imob-x.com.br`, e o Cadastrador descobre, analisa, propõe e testa seletores de extração, persiste a configuração e valida se tudo funciona.

## 2. Objetivo do Módulo

- Receber uma URL de imobiliária.
- Descobrir se o site permite extração por **sitemap** ou por **WSM** (Web Scraper Manual, via estruturados).
- Identificar o nome e domínio da imobiliária.
- Gerar seletores (extratores) para todos os campos obrigatórios e opcionais de um imóvel.
- Verificar a qualidade desses extratores antes de salvar.
- Persistir a imobiliária e seus extratores no banco.
- Rodar uma **validação de fumaça** (teste final) com o scraper real.
- Registrar tudo em um histórico de tentativas, com evidências HTML.

## 3. Entradas e Saídas

### Entrada

| Campo | Descrição |
|-------|-----------|
| `url` | URL da imobiliária, pode vir com ou sem `http://`, `www`, etc. |
| `name` | Nome de exibição da imobiliária. **Obrigatório.** |

### Saída (streaming SSE)

Durante o processo, o sistema envia eventos de progresso em tempo real:

- `fetching` — começou a baixar a página.
- `strategy_decided` — decidiu o modelo de execução.
- `identity_resolved` — descobriu nome e domínio.
- `synthesizing_selectors` — está criando seletores.
- `tournament_round` — está rodando uma rodada do torneio.
- `tournament_field_winner` — um campo teve um extrator vencedor.
- `tournament_decided` — torneio finalizado.
- `persisting` — salvando a imobiliária no banco.
- `validating` — rodando o scraper para validar.
- `result` — resultado final com `agency_id`, status e relatório.
- `error` — se algo deu errado, com motivo legível.

## 4. Fluxo de Negócio Passo a Passo

```
1. Receber URL
2. Normalizar URL e derivar domínio
3. Verificar se já existe agência ativa para esse domínio
4. Baixar homepage e sitemap
5. Decidir modelo de execução: sitemap, wsm ou unsupported
6. Se unsupported → rejeitar
7. Resolver identidade (nome da imobiliária)
8. Descobrir amostra de páginas de imóvel
9. Sintetizar e verificar extratores
   - Sitemap: usar Torneio de Extratores
   - WSM: usar verificação simples + retry
10. Se campos obrigatórios não forem verificados → rejeitar
11. Persistir agência e extratores no banco
12. Rodar validação de fumaça (scrapy)
13. Se fumaça falhar → marcar como saved_inactive
14. Registrar tentativa e evidências HTML
15. Retornar resultado
```

## 5. Modelos de Execução

O Cadastrador decide como o scraper vai atuar no site.

| Modelo | Quando é usado | O que acontece |
|--------|----------------|----------------|
| **sitemap** | Site tem sitemap com URLs de imóveis | Usa o sitemap para listar URLs e extrai dados de cada página de imóvel. |
| **wsm** | Site não tem sitemap, mas a homepage tem dados estruturados (Open Graph ou JSON-LD) | Usa a homepage como base e extrai via estruturados. |
| **unsupported** | Não tem sitemap nem dados estruturados | Rejeita o onboarding. |

### Decisão

- Se existirem URLs de imóvel no sitemap → **sitemap**.
- Se não tiver sitemap, mas tiver `og:` ou `jsonld` na homepage → **wsm**.
- Caso contrário → **unsupported**.

## 6. Descoberta do Site

### 6.1. Homepage

A homepage da URL informada é baixada com timeout de 15 segundos e até 2 retentativas.

### 6.2. Sitemap

O sistema tenta encontrar o `sitemap.xml` e sitemaps filhos (até profundidade 3). Ele:

1. Coleta todos os sitemaps encontrados.
2. Para cada urlset, conta:
   - `total_urls` — total de URLs.
   - `keyword_count` — URLs que parecem páginas de imóvel (contêm palavras como `imovel`, `apartamento`, `casa`, etc.).
   - `exclusion_count` — URLs que claramente não são imóveis (blog, contato, etc.).
3. Prioriza sitemaps com palavras-chave de imóveis.
4. Se não encontrar, usa o sitemap com maior volume de URLs candidatas (mínimo 8).

### 6.3. Amostra de Torneio

Para sites **sitemap**, o sistema escolhe uma amostra de páginas de imóvel para testar os extratores.

- Tamanho: aproximadamente **30%** do sitemap.
- Limites: mínimo **20**, máximo **60** páginas.
- Seleção: **estratificada** (pega páginas espaçadas pela lista, não só as primeiras).
- Downloads: feitos em paralelo, com limite de **8** concorrentes e timeout de 15s.
- Se não conseguir baixar nenhuma página de imóvel, usa a homepage como fallback.

Para sites **wsm**, a amostra é apenas a homepage.

## 7. Identidade da Imobiliária

O nome da imobiliária é informado diretamente pelo frontend no payload de onboarding. Não há resolução automática de nome via LLM.

O domínio é sempre derivado da URL informada. A identidade usada no restante do fluxo é:

- `name`: exatamente o valor enviado pelo frontend.
- `domain`: domínio derivado da URL (ex: `https://www.imob-x.com.br` → `imob-x.com.br`).

## 8. Campos de Extração

Os extratores são divididos em dois grupos.

### 8.1. Campos Obrigatórios (mandatory)

Todo imóvel precisa ter esses campos. Se algum deles não for verificado, o onboarding é rejeitado.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `tipo` | texto | Tipo do imóvel (Apartamento, Casa, etc.) |
| `valor` | número | Preço do imóvel |
| `bairro` | texto | Bairro |
| `cidade` | texto | Cidade |
| `link_imovel` | URL | Link da página do imóvel |

### 8.2. Campos Best-Effort (opcionais)

São campos desejáveis, mas não obrigatórios. O sistema tenta extrair, mas não rejeita se não conseguir.

Incluem:

- `imagem`, `descricao`
- Características numéricas: `quartos`, `suites`, `banheiros`, `vagas`, `area`, `andar`, `ano_construcao`
- Comodidades booleanas: `aceita_permuta`, `financiamento`, `piscina`, `churrasqueira`, `academia`, `salao_festas`, `playground`, `sacada`, `mobiliado`, `ar_condicionado`, `lavanderia`, `escritorio`, `closet`, `elevador`, `portaria_24h`
- `posicao_solar`

## 9. Síntese de Extratores

A síntese é feita por um modelo de LLM (DeepSeek), que recebe:

- Até **3 amostras HTML** (evidências).
- Lista de campos a extrair.
- Seletores que já falharam anteriormente (`prior_failures`).
- Modelo de execução (`sitemap` ou `wsm`).
- Estratégia de origem (opcional): `dom`, `structured` ou `text`.

O LLM retorna um JSON com extratores propostos. Cada extrator contém:

- `field_name` — nome do campo.
- `source_type` — tipo de fonte: `xpath`, `css`, `og`, `jsonld` ou `literal`.
- `selector_value` — o seletor em si.
- `output_type` — `text`, `number`, `boolean`, `image_url`, `link_url`.
- `priority` — ordem de prioridade na cadeia.
- `is_optional` — se é opcional.
- `pipeline` — transformações DSL opcionais (split, regex, replace, etc.).

### Estratégias de origem (usadas no torneio)

- `dom`: seletores visuais (XPath/CSS).
- `structured`: dados estruturados (Open Graph, JSON-LD, meta).
- `text`: extração a partir de textos visíveis (título, h1, descrição) com pipelines.

## 10. Verificação de Extratores

Antes de aceitar um extrator, o sistema verifica se ele realmente funciona.

### 10.1. Verificação Simples (`SelectorVerifier`)

Aplica o extrator em todas as páginas da amostra e verifica se o resultado é plausível.

- O campo deve retornar valor não vazio.
- O valor deve fazer sentido para o tipo (ex: `valor` precisa ter número; `link_imovel` precisa começar com `http`).
- A taxa de sucesso (`pass_rate`) deve ser de pelo menos **90%**.

### 10.2. Torneio de Extratores (`ExtractorTournament`)

Usado apenas no modelo **sitemap**. Para cada campo, o sistema:

1. Gera até **3 candidatos independentes** (um de cada estratégia: dom, structured, text).
2. Executa cada candidato em toda a amostra.
3. Define a "verdade" da página como o valor com mais votos entre os candidatos, reforçado por uma **Âncora de Evidência**.
4. Calcula a **Acertividade** de cada candidato: fração de páginas onde o valor do candidato bate com a verdade da página.
5. O candidato com maior acertividade vence (com desempate por cobertura e ranque de fonte).
6. Candidatos que concordam com o vencedor entram como **fallback** na cadeia de prioridade.

### 10.3. Âncora de Evidência

É uma valor detectado heuristicamente na página, usado como "testemunha forte" na hora de definir a verdade:

- Preços no formato `R$ 500.000`.
- Áreas no formato `120 m²`.
- Pares de características (ex: `4 Quarto(s)`).
- Para `link_imovel`, a própria URL da página.

## 11. Regras de Aceite

### 11.1. Campos Obrigatórios

Um campo obrigatório só é aceito se:

- Existir um vencedor no torneio.
- A **cobertura da cadeia** for ≥ **90%** (`pass_rate >= 0.9`).
- A **acertividade** do vencedor for ≥ **0.8**.

Se algum campo obrigatório não for aceito após até **3 rodadas** de torneio (cada uma com retentativa), o onboarding é **rejeitado**.

### 11.2. Campos Best-Effort

Campos opcionais usam a regra da **Presença**:

- O campo só é julgado nas páginas onde existe evidência independente de que ele está presente (âncora ou dois testemunhos distintos concordando).
- Deve haver pelo menos **5 páginas com presença**.
- A acertividade sobre páginas com presença deve ser ≥ **90%**.
- Se não houver presença, o campo é descartado sem rejeitar o onboarding.

Isso evita rejeitar bons extratores apenas porque o campo não existe em parte do site (ex: `vagas` não aparece em todos os imóveis).

## 12. Retry e Fallbacks

### 12.1. Retry no modelo WSM

Para cada campo obrigatório que falhar na primeira síntese:

- O sistema informa ao LLM os seletores que já falharam (`prior_failures`).
- Pede uma nova síntese focada apenas nos campos faltantes.
- Repete até **3 vezes por campo**.

### 12.2. Retry no Torneio

O torneio pode rodar até **3 rodadas**. A cada rodada:

- São gerados novos candidatos.
- Os seletores que falharam nas rodadas anteriores são informados ao LLM.
- Campos já verificados param de ser reprocessados.

### 12.3. Cadeia de Fallback

No torneio, candidatos que concordam com o vencedor são mantidos como extratores de backup (prioridade 2, 3, etc.). Se o primeiro falhar durante o scraping, o próximo é tentado.

## 13. Persistência

Após aprovação dos extratores, a imobiliária é salva.

### 13.1. Tabelas

- `sitemap_agencies` — imobiliárias do tipo sitemap.
- `wsm_agencies` — imobiliárias do tipo WSM.
- `agency_field_extractors` — extratores de cada campo.

### 13.2. Regras de persistência

- Se já existir agência **inativa** para o mesmo domínio, ela é substituída.
- Se já existir agência **ativa** para o mesmo domínio, o onboarding é bloqueado com erro **409** (retorne `POST /agencies/{id}/reonboard`).
- Se o nome da imobiliária já estiver em uso, é adicionado o domínio entre parênteses (ex: "Imob X (imob-x.com.br)").

### 13.3. Campos salvos

Para **sitemap**:

- `name`, `domain`, `sitemap_url`, `allowed_url_patterns`, `is_active = true`.

Para **wsm**:

- `name`, `domain`, `url`, `url_pagination_template`, seletores de paginação e cards, `is_active = true`.

### 13.4. Extratores

Cada extrator aprovado vira uma linha em `agency_field_extractors` com:

- `agency_type`, `agency_id`
- `field_name`, `priority`, `source_type`, `selector_value`
- `selector_index`, `selector_join`, `pipeline`, `output_type`
- `is_optional`

O pipeline padrão para campos booleanos opcionais é `exists`.

## 14. Validação de Fumaça (Smoke Validation)

Após persistir, o sistema roda o scraper real para garantir que a integração funciona.

- Para **sitemap**: roda até **10** itens.
- Para **wsm**: roda até **30** itens.
- Timeout: **90 segundos**.

### Resultados possíveis

| Resultado | Significado |
|-----------|-------------|
| `active` | O scraper conseguiu extrair itens suficientes e todos os campos obrigatórios estão preenchidos. A agência fica ativa. |
| `saved_inactive` | O scraper não conseguiu extrair itens suficientes, ou a fumaça foi inconclusiva (timeout, por exemplo). A agência é salva, mas fica inativa. Não é rejeição. |

> **Importante:** a validação de fumaça nunca rejeita. Ela só confirma ativação ou desativa. A rejeição só acontece quando o torneio/verificação não consegue extratores obrigatórios.

## 15. Tratamento de Erros

Durante o onboarding, erros de rede e execução são classificados em motivos legíveis:

| Erro | Quando ocorre |
|------|---------------|
| `name_resolution_failed` | Domínio não encontrado (DNS). |
| `connection_failed` | Site offline ou inacessível. |
| `request_timeout` | Site demorou mais de 15s para responder. |
| `http_status_error` | Site retornou erro HTTP (4xx/5xx). |
| `unsupported_site` | Site não tem sitemap nem dados estruturados. |
| `empty_initial_proposal` | LLM não retornou extratores na primeira síntese. |
| `no_verified_extractors` | Nenhum extrator passou na verificação. |
| `missing_mandatory_extractors` | Faltam campos obrigatórios. |

Todos os erros são registrados em `agency_onboarding_attempts` com o motivo e a duração.

## 16. Reonboard

O endpoint `POST /agencies/{id}/reonboard` permite refazer o onboarding de uma agência existente:

1. Busca a agência pelo ID.
2. Desativa a agência atual.
3. Reexecuta o onboarding usando a URL/fonte original.
4. Persiste a nova configuração.

## 17. Concorrência e Duplicidade

- O sistema usa um **semáforo** para limitar onboarding simultâneos (configurável via `max_concurrent`).
- Se o limite for atingido, retorna **503** com header `Retry-After: 30`.
- O endpoint exige token de autenticação.

## 18. Registro de Tentativas e Evidências

### 18.1. Tentativa (`agency_onboarding_attempts`)

Toda execução de onboarding gera um registro com:

- `agency_type`, `agency_id` (se persistido).
- `submitted_url`, `derived_domain`.
- `outcome`: `active`, `saved_inactive`, `rejected` ou `error`.
- `report`: relatório completo, incluindo amostra, campos, issues, estratégia, rodadas de LLM e resultado do torneio.
- `duration_ms`, `llm_rounds`.
- `created_at`.

### 18.2. Evidências HTML (`agency_onboarding_evidence`)

Para tentativas bem-sucedidas, o sistema salva o HTML de cada página da amostra usada no torneio. Isso permite depois auditar ou refinar extratores com as mesmas evidências originais.

Cada evidência contém:

- `agency_onboarding_attempt_id`
- `sample_index`, `url`
- `content_hash` (SHA-256 do HTML)
- `html` completo
- `captured_at`

## 19. Glossário

| Termo | Significado |
|-------|-------------|
| **Amostra de Torneio** | Conjunto de páginas de imóvel usadas para testar e pontuar extratores no modelo sitemap. |
| **Âncora de Evidência** | Valor detectado heuristicamente na página (preço, área, características) usado como referência de verdade. |
| **Acertividade** | Fração de páginas onde o valor do extrator candidato coincide com a verdade da página. |
| **Presença** | Prova de que um campo existe em uma página, independentemente do extrator vencedor. |
| **Torneio de Extratores** | Processo de competir candidatos independentes por campo e escolher o melhor. |
| **Extrator Candidato** | Um seletor proposto para um campo durante o torneio. |
| **Validação de Fumaça** | Teste final com o scraper real para confirmar se a integração funciona. |
| **Best-Effort** | Campos opcionais que são extraídos quando possível, mas não são obrigatórios. |
| **Rejeitada** | Outcome usado quando há evidência positiva de que a extração é impossível ou errada (falta campo obrigatório). |

## 20. Resumo das Regras Mais Importantes

1. **Sempre verifica duplicidade de domínio ativo** antes de começar.
2. **Sitemap é o modelo preferido**; WSM só se não houver sitemap mas houver dados estruturados.
3. **Campos obrigatórios são inegociáveis**: sem eles, o onboarding é rejeitado.
4. **Campos opcionais usam Presença**: só são aceitos se houver evidência independente de que existem.
5. **Torneio usa consenso + âncora** para definir a verdade da página, não apenas preenchimento.
6. **Fallbacks são mantidos**: candidatos que concordam com o vencedor viram backup.
7. **Fumaça nunca rejeita**: só ativa ou desativa a agência.
8. **Tudo é registrado**: tentativas, relatórios e evidências HTML ficam no banco para auditoria.
