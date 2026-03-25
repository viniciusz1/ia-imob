# SYNC Report - ai-searcher

## Metadados
- Modulo: `ai-searcher`
- Data da analise: `2026-03-24`
- Backend analisado: `docs/technical-implementations/ai-searcher/laravel/especificacao.md`
- Frontend analisado: `docs/technical-implementations/ai-searcher/next/especificacao.md`
- Regras utilizadas:
  - `.agents/rules/tech-laravel.md`
  - `.agents/rules/tech-nextjs.md`

## Resultado Geral
- Status: `APROVADO COM AVISOS`
- Resumo executivo:
  - A sincronização dos dados funciona na prática através de um mapeamento manual (Adapter/Parser) feito no Frontend. No entanto, o contrato atual fere diretrizes arquiteturais do Backend (ausência de API Resources) e a paginação/ordenação é feita in-memory no Frontend em vez do banco de dados, o que escalará mal.

## Inventario de Contrato (Normalizado)
| Campo (`path`) | Backend (`type/required/nullable`) | Frontend (`type/required/nullable`) | Status |
| --- | --- | --- | --- |
| `id` | `integer / sim / nao` | `number / sim / nao` | `OK` |
| `tipo` | `string / nao / sim` | `string / sim / nao` | `AVISO` |
| `imobiliaria` | `string / nao / sim` | `string / sim / nao` | `AVISO` |
| `valor` | `decimal / nao / sim` | `number / sim / nao` | `AVISO` |
| `bairro` | `string / nao / sim` | `string / sim / nao` | `AVISO` |
| `cidade` | `string / nao / sim` | `string / sim / nao` | `AVISO` |
| `imagem` | `text / nao / sim` | `string / sim / nao` | `AVISO` |
| `link_imovel` | `text / nao / sim` | `string / sim / nao` | `AVISO` |
| `descricao` | `text / nao / sim` | `string / sim / nao` | `AVISO` |
| `qtd_quartos` | `integer / nao / sim` | `number / sim / nao` | `AVISO` |
| `area_m2` | `decimal / nao / sim` | `number / sim / nao` | `AVISO` |
| `created_at` | `datetime / sim / nao` | `(nao mapeado)` | `AVISO` |
| `updated_at` | `datetime / sim / nao` | `(nao mapeado)` | `AVISO` |

*OBS: No contrato prático implementado, o Frontend recebe os valores `nullable` do Backend e converte obrigatoriamente usando `|| ""` ou `|| 0` para transformá-los em não-nulos e satisfazer sua tipagem fechada.*

## Divergencias Detectadas

### [ERRO] Ausência de API Resource no Backend
- Backend: O Controller retorna Models do Eloquent crus com `$properties = ScrapyProperty::all(); return response()->json($properties);`.
- Frontend: Espera um formato flexível de array e adapta as chaves no lado do cliente.
- Impacto: Fere a regra arquitetural primária (`tech-laravel.md` item 3: *"Nunca retorne um Model do Eloquent ou coleções cruas diretamente para o cliente. Tudo deve passar por Eloquent API Resources"*). Impede formatação correta de dados e oculta a estrutura padronizada (ex: `data` wrappers da API Resource).
- Acao recomendada: Criar o `ScrapyPropertyResource` de acordo com a regra. Retirar o adapter bruto de dentro da interface do frontend e deixar o API Resource prover os nomes de chave como necessitado (ex: retornar `quartos` ao invés de `qtd_quartos` caso o padrão camelCase/simplificado deva nascer na rede). 
- Referencia: `.agents/rules/tech-laravel.md` -> 3. Transformação e Resposta de Dados (Output).

### [AVISO] Responsabilidade e Localização do Mapeamento (Front-End)
- Backend: Expõe modelo bruto snake_case (`qtd_quartos`, `area_m2`).
- Frontend: Mapeia dentro de uma promise `useEffect` no próprio Visual Component (`AiSearcherClient.tsx`).
- Impacto: O componente Client View fica inflado com regras de transformação e Parsing.
- Acao recomendada: Transferir a lógica de "map do payload" para o diretório `/src/services` como ditado por `tech-nextjs.md` item 5, criando um Service de busca, ou (o preferível), ajustar a API Laravel para já prover chaves aderentes através do `JsonResource`.
- Referencia: `.agents/rules/tech-nextjs.md` -> 5. Estrutura de Diretórios Recomendada (`/src/services`).

### [AVISO] Paginação e Performance na Listagem (Memory Loader)
- Backend: Retorna centenas de registros (`::all()`) simultaneamente sem `paginate()`.
- Frontend: Realiza a paginação e "Filters" integralmente via JS `slice()` arrays memory in-the-fly (`AiSearcherClient.tsx`).
- Impacto: Dificuldades de escalabilidade conforme o scraping crescer. O fetch de uma rede com milhares de properties afetará significantemente a performance do Client.
- Acao recomendada: Desenvolver filtros (URL query strings) do lado do Servidor Laravel junto da numeração do `paginate()`. O Next.js apenas refletiria estes dados da URL aos Server Components (SSG/SSR) conforme `tech-nextjs.md`.
- Referencia: `docs/technical-implementations/ai-searcher/next/especificacao.md` -> 2.1 (Fluxo de Dados: Requisição assíncrona recebendo payload gigante `mockProperties`).

## Itens OK (Sem Divergencia)
- A tipagem base fundamental (tipos literais: string, inteiros para quartos, numbers para valor e áreas) fluem sem quebra de `strict typing` no lado do TypeScript.
- Resposta global consumida corretamente utilizando o Axios custom configurado na base (`api.ts`).

## Bloqueios
- Nenhum bloqueio para runtime atual. A funcionalidade transita corretamente em Produção/Homologação, mas requer ajustes baseando-se no débito técnico listado.

## Plano de Correcao
1. Criar `App\Http\Resources\Api\ScrapyPropertyResource` para envelopar o retorno da propriedade e renomear campos de Snake Case para a saída, satisfazendo a regra Laravel de API Resources.
2. Aplicar paginação no backend Laravel via `$request->query()` para os filtros de busca e remover o load global feito por `::all()`, garantindo escalabilidade.
3. Repassar e limpar as Server Actions / Services Client-Side no projeto React e migrar responsabilidades de listagem para componentes Smart/Server, movendo lógica pesada de formatação de JSON para fora do `AiSearcherClient`.

## Criterio de Saida
- `SYNC_REPORT.md` atualizado com o scan.
- Divergências apontadas listadas sob o viés crítico entre `.agents/rules/` e especificações.
