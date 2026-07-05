# Contexto: crawler-machine

## Domínio

Sistema especializado em extrair dados de imobiliárias a partir da URL base de um site.

## Glossário

- **URL base**: endereço inicial do site da imobiliária (ex: `https://imbsmart.com.br`). O ponto de partida para descoberta.
- **Schema do domínio imobiliário**: arquivo global e editável (`config/domain.json`) que lista os campos padrão a serem extraídos de qualquer imobiliária (ex: `quartos`, `valor`, `bairro`, `cidade`) e as configurações globais de LLM, crawler e discovery. Serve de entrada para a geração de schemas específicos por site.
- **Discovery**: etapa de descoberta automática de URLs relevantes a partir da URL base.
- **Schema**: definição estruturada (XPath/CSS) gerada por IA que mapeia onde cada campo de imóvel está no HTML.
- **URLDiscoverer**: classe responsável pela descoberta automática de URLs a partir da URL base.
- **SchemaGenerator**: classe que gera o schema de extração (XPath/CSS) a partir de uma URL de exemplo e dos campos do domínio.
- **ImovelCrawler**: classe que executa a extração estruturada nas URLs descobertas usando o schema gerado.
- **DataNormalizer**: classe que normaliza os registros extraídos de acordo com as coerções definidas nos campos do domínio.
- **Pipeline**: orquestrador que executa as quatro etapas em sequência e coordena logs/progresso no terminal.
- **CLI**: interface de terminal com subcomandos para executar cada etapa isoladamente (`discover`, `schema`, `crawl`, `normalize`) ou o fluxo completo (`run`).
- **Pasta de saída**: estrutura `output/<slug-do-dominio>/<timestamp>/` contendo os artefatos de cada execução (`discovered.json`, `schema.json`, `raw.json`, `normalized.json`).
- **Fonte**: origem dos dados (ex: nome da imobiliária). Representada por um slug, passado via CLI com `--source-name`.
- **PostgresSink**: destino opcional de persistência. Quando configurado, salva cada execução como um `crawler_run`, os dados brutos em `raw_properties` e os imóveis normalizados em `market_properties`.
- **crawler_run**: registro de uma execução do crawler no Postgres. Apenas o run mais recente com status `completed` de uma fonte está marcado como `latest`.
- **MarketProperty**: imóvel normalizado persistido no Postgres, vinculado a um `crawler_run` e a um `raw_property`.
- **RawProperty**: dado bruto extraído de um imóvel, persistido antes da normalização, permitindo reprocessamento e debug.
- **CatalogRepository**: repositório que carrega os catálogos de normalização (`cities`, `neighborhoods`, `property_types`) em memória para consulta pelos normalizadores semânticos.
- **FieldNormalizer**: contrato para classes que normalizam um campo individual, retornando `NormalizationResult`.
- **NormalizationResult**: resultado da normalização de um campo, contendo valor normalizado, flag de validade, warnings e flag de omissão.
- **QualityReport**: relatório global de qualidade gerado por execução, com estatísticas de validação por campo e lista de registros com problemas.
- **crawler schema**: schema dedicado no Postgres (`crawler`) que abriga catálogos, dados brutos e dados normalizados do crawler, isolados do schema do backend.
- **discovery_runs**: tabela que persiste os resultados de descoberta de URLs por fonte. Segue o mesmo padrão `status`/`latest` do `crawler_runs`, com FK opcional para `crawler_runs.id`. Permite reutilizar URLs descobertas entre execuções.
- **schema_runs**: tabela que persiste o schema de extração (XPath/CSS) gerado por IA por fonte. Segue o mesmo padrão `status`/`latest`, com FK opcional para `crawler_runs.id`. Armazena `schema_data` (JSONB), `schema_type`, `sample_url` e `fields_snapshot`.

## Decisões arquiteturais

- O crawler continua gerando JSON localmente; o Postgres é um sink opcional ativado pelas variáveis `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME` e `DB_PASSWORD`.
- Cada execução com sink cria um `crawler_run` e desmarca o flag `latest` dos runs anteriores da mesma fonte dentro de uma transação atômica.
- Os consumers do backend (AI Searcher e Valuation) leem apenas imóveis do run `completed`+`latest` de cada fonte.
- Discovery e schema generation também são persistidos em tabelas com padrão `status`/`latest`, permitindo reutilização entre execuções. O pipeline reusa resultados anteriores por padrão; flags `--regenerate-discovery` e `--regenerate-schema` forçam nova geração.
- `discovery_runs` e `schema_runs` podem existir independentemente (via comandos `discover` e `schema` com `--save-to-db`) ou vinculados a um `crawler_run` quando gerados dentro do pipeline `run`.