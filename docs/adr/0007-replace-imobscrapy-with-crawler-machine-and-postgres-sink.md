# ADR 0007: Replace imobscrapy with crawler-machine and persist market data to Postgres

## Status

Accepted; decision 2 is superseded by ADR 0012 and decision 5 is superseded by ADR 0010.

## Context

O projeto usava `imobscrapy` como serviço de scraping, com duas abordagens distintas (WSM e sitemap), configurações de extratores no banco e persistência em tabelas legadas (`scrapy-properties`, `wsm_agencies`, `sitemap_agencies`, etc.).

O `crawler-machine` foi criado como nova biblioteca de scraping, com discovery, schema gerado por IA e normalização. Inicialmente ele persistia apenas em JSON. Precisávamos:

1. Tornar o `crawler-machine` a fonte oficial de dados de mercado.
2. Persistir os dados no Postgres do backend para que AI Searcher e Valuation possam consumi-los.
3. Remover todo o legado do `imobscrapy` (tabelas, models, controllers, rotas, permissões, frontend).

## Decision

1. **Substituir `imobscrapy` por `crawler-machine`** como scraper oficial.
2. **Adicionar um sink Postgres opcional** ao `crawler-machine`. Quando as credenciais `DB_*` estiverem presentes, o crawler salva run + properties no Postgres; caso contrário, continua em JSON.
3. **Modelar runs e properties**:
   - `crawler_runs`: uma execução por fonte, com status, timestamps e flag `latest`.
   - `market_properties`: imóveis vinculados a um run, com as mesmas colunas que a antiga `scrapy-properties`.
4. **Garantir atomicidade**: run + properties + atualização do flag `latest` ocorrem dentro de uma transação Postgres.
5. **Ler apenas o latest**: AI Searcher e Valuation consultam apenas imóveis do run `completed`+`latest` de cada fonte.
6. **Mapear nomes de campos**: o crawler extrai nomes como `tipo_imovel`, `url`, `detalhes`, `area_util` e `ano`; o sink converte para `tipo`, `link_imovel`, `descricao`, `area` e `ano_construcao`.
7. **Remover o legado**: excluímos tabelas, models, controllers, resources, rotas, seeders, factory, testes, módulo frontend e permissões do `imobscrapy`.
8. **Adicionar amenities ao schema**: o `config/domain.json` passa a declarar campos booleanos de comodidades (`piscina`, `churrasqueira`, etc.) e o normalizer ganha coerção `boolean`.

## Consequences

- **Positivas**: infraestrutura unificada, menos código legado, dados de mercado acessíveis diretamente pelo backend, runs versionadas e atomicidade na persistência.
- **Negativas**: a remoção do legado exige `migrate:fresh` ou migração manual de dados históricos; o crawler-machine ainda depende de credenciais LLM e Postgres para o modo completo.
