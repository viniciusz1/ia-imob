# ADR 0008: Isolar tabelas do crawler no schema `crawler` e adicionar normalização semântica

## Status

Accepted

## Context

O `crawler-machine` persistia dados de mercado na tabela `market_properties` do schema público do Laravel, misturando responsabilidades do crawler com o domínio do backend. Além disso, o algoritmo de normalização era limitado a coerções simples (`int`, `float`, `currency`, `string`, `boolean`), sem validação de qualidade nem vocabulário canônico.

Isso causava:

- Variações de `tipo_imovel` (`Apto`, `apartamento`, `Apartamento`) quebrando filtros.
- `bairro` e `cidade` salvos como texto livre, sem padronização.
- Ausência de validação de ranges (ex: `valor` zerado, `ano` impossível).
- Impossibilidade de debugar regras de normalização, pois o dado bruto extraído era descartado.

## Decision

1. **Criar o schema dedicado `crawler`** no Postgres para abrigar:
   - Catálogos de normalização: `cities`, `neighborhoods`, `property_types`.
   - Dados brutos: `raw_properties`.
   - Dados normalizados: `market_properties`.
2. **Mover `market_properties` para `crawler.market_properties`** e atualizar o model `App\Models\MarketProperty` do Laravel para apontar para essa tabela.
3. **Persistir bruto e normalizado**: cada execução salva o registro bruto em `raw_properties` e o normalizado em `market_properties`, vinculados por `raw_property_id`.
4. **Adicionar metadados de qualidade**: `market_properties` ganha `quality_status` e `quality_metadata`, permitindo filtrar registros problemáticos.
5. **Implementar normalização semântica** via classes específicas por campo (`PropertyTypeNormalizer`, `CityNormalizer`, `NeighborhoodNormalizer`), consultando catálogos carregados em memória.
6. **Implementar validação de ranges** para campos numéricos (`valor`, `area_util`, `quartos`, `ano`, etc.) via normalizadores dedicados.
7. **Gerar relatório de qualidade** em arquivo (`quality_report.json`) e metadados `_quality` por registro, tanto no modo arquivo quanto no modo Postgres.
8. **Manter funcionamento sem Postgres**: quando as credenciais `DB_*` não estão presentes, o crawler continua gerando `raw.json`, `normalized.json` e `quality_report.json` localmente, aplicando apenas as validações que não dependem de catálogos.

## Consequences

- **Positivas**: isolamento claro entre crawler e backend, dados auditáveis, reprocessamento sem recrawlear, qualidade mensurável, filtros consistentes no backend.
- **Negativas**: o backend precisa saber que `market_properties` mudou de schema; novos ambientes precisam rodar as migrations do Laravel que recriam as tabelas no schema `crawler`.
