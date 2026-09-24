# Avaliação de imóveis: venda e locação

Documento da implementação realizada em 10/09/2026. As evidências usam dados fictícios da demonstração local; não representam pesquisas ou anúncios reais de mercado.

Após essa demonstração, foi ativada uma base com imóveis scrapeados. A configuração atual e a preservação do histórico anterior estão descritas em [Restauração local do backup](restauracao-base-scrapeada-20260813.md).

## 1. Objetivo e comportamento entregue

O módulo de avaliação passou a estimar tanto o valor de venda quanto o aluguel mensal de casas, apartamentos e sobrados. O usuário escolhe a finalidade antes de buscar os comparáveis. Essa escolha determina o preço usado no cálculo e fica preservada no histórico e nos relatórios.

| Antes | Depois |
|---|---|
| Uma avaliação tratava o preço como venda. | A finalidade distingue `sale` (venda) de `rent` (locação mensal). |
| Os comparáveis forneciam apenas `valor`. | Locação utiliza exclusivamente `valor_aluguel`; venda continua usando `valor`. |
| A exibição arredondava valores para milhares. | Aluguéis aparecem com centavos e indicação `/mês`. Venda mantém a apresentação anterior. |
| Não havia finalidade no histórico. | Finalidade aparece no resultado, no histórico, na API e nos documentos. |

O escopo é aluguel mensal residencial. Condomínio, IPTU e outras taxas não compõem o valor estimado. A interface informa essa definição. Diárias, temporada, terrenos, imóveis rurais e comerciais não foram incluídos.

## 2. Identificação da finalidade

Foi criada a classe [ValuationPurpose](../ai-backendd-imobiliaria/app/Domain/Valuation/ValuationPurpose.php), com os valores `sale` e `rent`, seus rótulos e a formatação monetária correspondente.

A finalidade acompanha a entrada em [ValuationInput](../ai-backendd-imobiliaria/app/Domain/Valuation/ValuationInput.php), chega aos endpoints pelo [ValuationController](../ai-backendd-imobiliaria/app/Http/Controllers/Api/ValuationController.php) e é persistida por [CreateMarketValuation](../ai-backendd-imobiliaria/app/Application/Valuation/CreateMarketValuation.php).

O [StoreValuationRequest](../ai-backendd-imobiliaria/app/Http/Requests/Valuation/StoreValuationRequest.php) aceita apenas `sale` e `rent` quando o campo é enviado. Valores inválidos, vazios ou nulos geram erro de validação. Para compatibilidade com clientes antigos, omitir `purpose` continua significando venda.

## 3. Banco de dados

A [migration de suporte à locação](../ai-backendd-imobiliaria/database/migrations/2026_09_10_000001_add_rental_valuation_support.php) acrescenta:

| Tabela | Campo | Tipo | Regra |
|---|---|---|---|
| `property_valuations` | `purpose` | `varchar(10)` | Padrão `sale`; avaliações existentes passam a ser identificadas como venda. |
| `crawler.market_properties` | `valor_aluguel` | `decimal(15,2)` | Opcional; guarda o aluguel mensal. Registros existentes ficam sem aluguel informado. |

Os models [PropertyValuation](../ai-backendd-imobiliaria/app/Models/PropertyValuation.php) e [MarketProperty](../ai-backendd-imobiliaria/app/Models/MarketProperty.php) foram ajustados para aceitar os novos campos. `valor_aluguel` é convertido para número no model de mercado.

As colunas de resultado `base_*_value` e `final_*_value` foram reutilizadas. Sua unidade depende da finalidade: reais para venda e reais por mês para aluguel. Não foi criada uma segunda estrutura de avaliação.

O método `down()` remove as duas colunas. Executar rollback elimina as informações contidas nelas; não é necessário para reiniciar o projeto.

## 4. Cálculo e escolha dos comparáveis

Em [MarketValuationCalculator](../ai-backendd-imobiliaria/app/Domain/Valuation/MarketValuationCalculator.php), o preço é selecionado pela finalidade:

```text
sale → MarketProperty.valor
rent → MarketProperty.valor_aluguel

valor por m² = preço escolhido ÷ área do comparável
faixa mínima = percentil 25 dos valores por m² × área avaliada
valor central = mediana dos valores por m² × área avaliada
faixa máxima = percentil 75 dos valores por m² × área avaliada
```

Não há conversão automática entre preço de venda e aluguel. Um anúncio pode servir para as duas finalidades quando possui ambos os preços. Para um anúncio exclusivamente de locação, `valor` deve ficar nulo e `valor_aluguel` deve conter o aluguel mensal.

Na locação, o aluguel precisa ser finito e maior que zero. Valores ausentes, zero ou negativos são descartados. Na venda, permanece a faixa de validação anterior de R$ 50.000 a R$ 100.000.000. O preço e a área também passam por verificação de finitude.

As demais regras existentes foram mantidas para ambas as finalidades:

- Correspondência de cidade e bairro normalizados, tipo residencial, quartos e vagas.
- Banheiros inicialmente iguais; a busca pode aceitar diferença de até um banheiro.
- Área de 20 a 2.000 m² e limites existentes para características do imóvel.
- Até 50 candidatos na revisão manual; todos precisam receber uma decisão, com pelo menos um aprovado.
- No cálculo automático, mínimo de cinco comparáveis, seleção de até 30 por proximidade de área e remoção dos extremos quando a amostra permite.
- Quando declarado risco de enchente, permanece a redução de 30% sobre toda a faixa calculada, inclusive na locação.

O algoritmo estatístico, os critérios gerais e o percentual de enchente já existiam. A ampliação faz essas regras trabalharem com o preço da finalidade escolhida.

## 5. Histórico e evidências preservadas

Cada avaliação salva guarda a finalidade e uma cópia dos comparáveis usados/revisados. A evidência agora inclui `purpose`, além de `price`, `price_per_square_meter`, características, origem, link e decisão de revisão.

Alterações futuras no anúncio não recalculam o histórico nem substituem o preço preservado. Evidências antigas que não têm `purpose` continuam sendo apresentadas como venda.

O [ValuationResource](../ai-backendd-imobiliaria/app/Http/Resources/ValuationResource.php) retorna `purpose` e `purpose_label`, além das faixas, resumo e evidências. Os valores de aluguel exibidos preservam centavos, por exemplo `R$ 2.880,00 /mês`.

As permissões existentes `valuations.create` e `valuations.view` e o isolamento por imobiliária foram mantidos. A funcionalidade não criou novos níveis de acesso.

## 6. Interface e relatórios

O [ValuationsClient](../ai-front-end-imobiliaria/src/components/features/valuations/ValuationsClient.tsx) recebeu o seletor **Finalidade da avaliação**, com **Venda** e **Locação mensal**. Venda é a escolha inicial.

Ao trocar a finalidade, os candidatos e suas seleções são limpos, exigindo uma nova busca. O cálculo revisado usa uma cópia da entrada que originou os candidatos. A finalidade também aparece no título do resultado e em uma coluna do histórico.

Os [tipos TypeScript](../ai-front-end-imobiliaria/src/types/valuation.ts) passaram a representar a finalidade na entrada, no resultado e nas evidências. Os serviços HTTP existentes continuam transportando os objetos tipados, sem novos endpoints.

Os documentos foram ajustados:

- [PDF](../ai-backendd-imobiliaria/app/Services/Valuation/SimplePdfReportGenerator.php): identifica finalidade e apresenta os aluguéis por mês.
- [Word](../ai-backendd-imobiliaria/app/Services/Valuation/WordValuationReportGenerator.php): identifica finalidade e preserva a precisão dos valores de aluguel.
- [Excel](../ai-backendd-imobiliaria/app/Services/Valuation/ComparableEvidenceExcelGenerator.php): identifica a modalidade e usa os cabeçalhos “Aluguel mensal” e “R$/m²/mês” na locação. A formatação monetária da planilha passou a ter duas casas decimais.

## 7. Contrato da API

Os endpoints permanecem em `/api/v1/valuations`:

| Método e caminho | Uso |
|---|---|
| `POST /candidates` | Buscar candidatos com a finalidade escolhida. |
| `POST /` | Criar a avaliação, opcionalmente com as decisões de revisão. |
| `GET /` | Consultar o histórico da imobiliária. |
| `GET /{id}` | Consultar os detalhes preservados. |
| `GET /{id}/report.pdf` | Baixar PDF. |
| `GET /{id}/report.docx` | Baixar Word. |
| `GET /{id}/comparables.xlsx` | Exportar comparáveis. |

Exemplo de entrada de locação para a demonstração:

```json
{
  "purpose": "rent",
  "city": ["Cidade Demonstração"],
  "neighborhood": ["Bairro Demonstração"],
  "residential_type": "house",
  "area": 120,
  "bedrooms": 3,
  "bathrooms": 2,
  "garage_spaces": 1,
  "flood_risk": false
}
```

No fluxo revisado, acrescentar `comparable_reviews` com os IDs retornados pela busca e `status` igual a `approved` ou `rejected` para cada candidato.

## 8. Demonstração reproduzível

O [RentalValuationDemoSeeder](../ai-backendd-imobiliaria/database/seeders/RentalValuationDemoSeeder.php) foi acrescentado para a apresentação local. Só executa com `APP_ENV=local`, cria uma imobiliária e um usuário próprios da demonstração e não substitui os usuários existentes. Também cria uma origem fictícia e cinco comparáveis; a execução repetida reutiliza a demonstração já publicada.

Credenciais exclusivamente da demonstração local:

```text
Login: avaliacao@demo.localhost
Senha: AvaliacaoDemo123!
```

Em `http://localhost:3000/avaliacoes`, preencher:

| Campo | Valor |
|---|---|
| Cidade | Cidade Demonstração |
| Bairro | Bairro Demonstração |
| Tipo | Casa |
| Área avaliada | 120 m² |
| Quartos / banheiros / vagas | 3 / 2 / 1 |
| Risco de enchente | Desativado |

Os cinco comparáveis têm 100 m² cada. Seus aluguéis são R$ 2.000, R$ 2.200, R$ 2.400, R$ 2.600 e R$ 2.800; os preços de venda são R$ 500.000, R$ 550.000, R$ 600.000, R$ 650.000 e R$ 700.000.

Com todos aprovados, os resultados esperados são:

| Finalidade | Mínimo | Central | Máximo |
|---|---:|---:|---:|
| Locação mensal | R$ 2.640,00/mês | R$ 2.880,00/mês | R$ 3.120,00/mês |
| Venda | R$ 660.000 | R$ 720.000 | R$ 780.000 |

Para apresentar evidências visuais, capture a tela em quatro momentos: seleção de locação, comparáveis com valores mensais, faixa calculada e histórico com as duas finalidades. Baixe também PDF, Word e Excel pelo resultado salvo. Os links dos anúncios da demonstração usam `.invalid` propositalmente e não levam a imóveis reais.

## 9. Execução no Windows / PowerShell

Com o Docker Desktop iniciado, abrir um terminal na raiz do repositório:

```powershell
cd ai-backendd-imobiliaria
docker compose up -d
docker compose exec -T laravel.test php artisan migrate
docker compose exec -T laravel.test php artisan db:seed --class=RentalValuationDemoSeeder
cd ../ai-front-end-imobiliaria
npm.cmd run dev
```

As dependências já estão presentes neste checkout. A configuração local existente aponta a API para `http://localhost:5555` e o frontend para `http://localhost:3000`. O frontend encaminha as chamadas para a API; acessar com `localhost` mantém a configuração de autenticação consistente.

O `start.sh` existente pressupõe Bash e inclui outros processos. A sequência acima inicia os serviços necessários à avaliação diretamente no Windows.

Para parar uma execução interativa do frontend, usar `Ctrl+C`. Para parar os containers preservando os dados: executar `docker compose stop` na pasta do backend. Não é necessário remover volumes nem recriar o banco.

## 10. Testes e limites da entrega

Os [testes da interface](../ai-front-end-imobiliaria/src/components/features/valuations/__tests__/ValuationsClient.test.tsx) cobrem o fluxo de venda e de locação, envio da finalidade, precisão de aluguel, limpeza de candidatos ao trocar finalidade, acesso, consulta e downloads. Os seis testes passaram na validação da implementação; o lint dos arquivos da interface também passou.

Os [testes da API](../ai-backendd-imobiliaria/tests/Feature/ValuationApiTest.php) receberam cenários para aluguel mensal, preços ausentes/inválidos, preservação histórica, relatórios, revisão manual, ajuste de enchente, compatibilidade com venda e rejeição de finalidade inválida. A execução no banco separado `testing` passou: **29 testes, 208 verificações**. O Pint também foi executado sobre os 15 arquivos PHP desta entrega e demonstração.

```powershell
# Backend, dentro de ai-backendd-imobiliaria:
docker compose exec -T -e APP_ENV=testing -e DB_DATABASE=testing -e DB_URL= -e XDEBUG_MODE=off laravel.test php artisan test --filter=ValuationApiTest --compact

# Frontend, dentro de ai-front-end-imobiliaria:
npm.cmd test -- src/components/features/valuations/__tests__/ValuationsClient.test.tsx
```

A checagem global de TypeScript encontrou erros em testes de outras áreas do projeto. Isso não equivale a uma aprovação global de build. O status atualizado da execução local e os arquivos de evidência ficam em [evidências da demonstração](evidencias/avaliacao-locacao/README.md).

O código do crawler não está neste checkout. Para uso com anúncios reais, sua ingestão ainda precisa preencher `valor_aluguel` conforme o [contrato do domínio](contexts/valuation/CONTEXT.md). A demonstração não implementa nem comprova essa integração. Sem aluguéis disponíveis, a busca não encontra candidatos válidos; no cálculo automático, o resultado é amostra insuficiente.
