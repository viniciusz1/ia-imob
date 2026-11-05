# Sprint: sugestão de faixa de preço no cadastro

## Entrega

Serviço transitório de sugestão de preço integrado à etapa **Valores** do cadastro e edição de imóveis. Reaproveita o cálculo de avaliação existente para venda e aluguel, sem criar avaliações salvas durante o preenchimento.

## Critérios de aceite

- Casas, apartamentos e sobrados usam cidade, bairro, área útil, quartos, banheiros e vagas já preenchidos.
- A finalidade determina venda, aluguel mensal ou consultas independentes para ambos.
- Dados incompletos ou tipos fora do escopo recebem orientação; amostra insuficiente não produz preço.
- O resultado exibe mínimo, valor central, máximo e quantidade de comparáveis.
- Aplicar o valor central é uma ação explícita; apenas o preço correspondente é alterado.
- Alterar características invalida o resultado, inclusive respostas que chegarem atrasadas.
- Autorização reutiliza `valuations.create`; nenhuma nova permissão, variável de ambiente ou migration.

## Contrato e decisões

Ver [Property Valuation](contexts/valuation/CONTEXT.md#registration-price-suggestion) para contrato da API, limites e mapeamento dos campos.

## Verificação

- Backend: `php artisan test --filter='MarketPriceSuggestionApiTest|RentalValuationCalculationTest|ValuationApiTest|AuthUserPermissionsTest|PermissionSeederTest'` usando o banco `testing`.
- Frontend: `npm test -- src/components/features/properties/__tests__`.
- Pint nos arquivos PHP alterados; ESLint nos arquivos frontend alterados e verificação TypeScript.

### Resultado da validação

- 45 testes backend passaram (335 assertions), incluindo regressões da avaliação e contrato de permissões.
- 24 testes frontend passaram.
- Pint: cinco arquivos aprovados. ESLint dos arquivos frontend desta sprint: sem erros.
- A rota local respondeu HTTP 401 sem autenticação, conforme esperado.
- A verificação global `tsc --noEmit --incremental false` apontou erros em arquivos fora desta sprint: fixtures de agências sem `market_search_weekly_limit`, imports de Vitest ausentes, mocks de autenticação/crawler incompatíveis e dados de leilões sem `ends_at`. Nenhum diagnóstico apontou arquivos da sugestão de preço.
