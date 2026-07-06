# crawler-machine

Sistema especializado em extrair dados de imobiliárias a partir da URL base de um site.

## Funcionamento

O sistema executa quatro etapas sequenciais:

1. **Discovery**: descobre URLs a partir da URL base usando `DomainMapper` do Crawl4AI.
2. **Schema generation**: gera um schema de extração (XPath/CSS) com IA a partir de uma URL de exemplo.
3. **Crawling**: extrai dados estruturados das URLs descobertas usando o schema gerado.
4. **Normalization**: converte valores brutos em tipos úteis (`int`, `float`, `currency`, `string`).

Cada etapa é representada por uma classe Python independente:

- `URLDiscoverer`
- `SchemaGenerator`
- `ImovelCrawler`
- `DataNormalizer`

A orquestração é feita pela classe `Pipeline` e a interface terminal é fornecida pela CLI.

## Instalação

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Configuração

Copie o exemplo de variáveis de ambiente:

```bash
cp .env.example .env
```

Edite `.env` e adicione sua chave da API DeepSeek:

```bash
DEEPSEEK_API_KEY=sk-sua-chave-aqui
```

Os campos a serem extraídos e as configurações globais ficam em `config/domain.json`.

## Uso

### Pipeline completo

```bash
python -m crawler_machine run https://imbsmart.com.br \
  --sample-url https://imbsmart.com.br/imovel/exemplo
```

### Etapas isoladas

Descobrir URLs:

```bash
python -m crawler_machine discover https://imbsmart.com.br
```

Gerar schema:

```bash
python -m crawler_machine schema https://imbsmart.com.br/imovel/exemplo
```

Crawlear usando schema e URLs salvos:

```bash
python -m crawler_machine crawl output/imbsmart-com-br/20260702_120000/schema.json \
  output/imbsmart-com-br/20260702_120000/discovered.json
```

Normalizar dados brutos:

```bash
python -m crawler_machine normalize output/imbsmart-com-br/20260702_120000/raw.json
```

## Saída

Os artefatos de cada execução são salvos em:

```
output/<slug-do-dominio>/<timestamp>/
  discovered.json
  schema.json
  raw.json
  normalized.json
  errors.json
```

## Testes

```bash
python -m pytest tests/ -v
```

## Estrutura de pastas

```
crawler-machine/
├── src/
│   ├── __init__.py
│   ├── __main__.py
│   ├── cli.py
│   ├── config.py
│   ├── crawler.py
│   ├── discoverer.py
│   ├── output.py
│   ├── pipeline.py
│   ├── schema_generator.py
│   ├── catalog.py
│   ├── sink.py
│   └── normalization/
│       ├── __init__.py
│       ├── result.py
│       ├── protocol.py
│       ├── engine.py
│       ├── coercers.py
│       ├── legacy.py
│       └── normalizers/
│           ├── area_normalizer.py
│           ├── city_normalizer.py
│           ├── details_normalizer.py
│           ├── image_normalizer.py
│           ├── integer_normalizer.py
│           ├── neighborhood_normalizer.py
│           ├── property_type_normalizer.py
│           ├── url_normalizer.py
│           ├── value_normalizer.py
│           └── year_normalizer.py
├── config/
│   └── domain.json
├── tests/
│   ├── test_cli.py
│   ├── test_config.py
│   ├── test_crawler.py
│   ├── test_data_normalizer_semantic.py
│   ├── test_discoverer.py
│   ├── test_normalizer.py
│   ├── test_output.py
│   ├── test_pipeline.py
│   ├── test_schema_generator.py
│   ├── catalog_seed.py
│   ├── crawler_schema.py
│   └── test_normalizers/
├── .env.example
├── README.md
├── requirements.txt
└── CONTEXT.md
```
