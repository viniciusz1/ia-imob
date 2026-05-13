# Plano Técnico 03: Índices pg_trgm

## 1. Motivação

`scopeApplyFilters` usa `ILIKE '%x%'` em várias colunas (`ScrapyProperty.php:84-88, 172, 178, 185, 191`). Sem índice GIN trigram, cada um desses casos é **sequential scan** — performance degrada linearmente com o volume da tabela.

Hoje, com poucos milhares de imóveis, ainda funciona. Quando escalar para múltiplas cidades (alvo do plano-mestre), a base passará de centenas de milhares de linhas — e a latência da busca pode multiplicar por 10–50×.

## 2. Pré-requisitos

- Extensão `pg_trgm` (PostgreSQL built-in, todas as versões modernas).
- Extensão `unaccent` (**já habilitada** via `2026_05_12_000001_enable_unaccent_extension.php`).

## 3. Migration

`database/migrations/2026_05_13_000001_add_trigram_indexes_to_scrapy_properties.php`:

```php
public function up(): void
{
    DB::statement('CREATE EXTENSION IF NOT EXISTS pg_trgm;');

    // unaccent não é IMMUTABLE por padrão → precisamos de uma versão imutável
    // pra usar em índice expression.
    DB::statement(<<<'SQL'
        CREATE OR REPLACE FUNCTION public.f_unaccent(text)
        RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS
        $func$ SELECT public.unaccent('public.unaccent', $1) $func$;
    SQL);

    DB::statement('CREATE INDEX IF NOT EXISTS idx_scrapy_props_bairro_trgm
        ON "scrapy-properties" USING GIN (f_unaccent(bairro) gin_trgm_ops);');

    DB::statement('CREATE INDEX IF NOT EXISTS idx_scrapy_props_cidade_trgm
        ON "scrapy-properties" USING GIN (f_unaccent(cidade) gin_trgm_ops);');

    DB::statement('CREATE INDEX IF NOT EXISTS idx_scrapy_props_descricao_trgm
        ON "scrapy-properties" USING GIN (f_unaccent(descricao) gin_trgm_ops);');
}

public function down(): void
{
    DB::statement('DROP INDEX IF EXISTS idx_scrapy_props_bairro_trgm;');
    DB::statement('DROP INDEX IF EXISTS idx_scrapy_props_cidade_trgm;');
    DB::statement('DROP INDEX IF EXISTS idx_scrapy_props_descricao_trgm;');
    DB::statement('DROP FUNCTION IF EXISTS public.f_unaccent(text);');
}
```

## 4. Ajuste no scope

Trocar `unaccent(...)` por `f_unaccent(...)` em `ScrapyProperty::scopeApplyFilters` (linhas 84, 88, 172, 178, 185, 191) para que o planner use o índice.

```php
$p->whereRaw('f_unaccent(bairro) ILIKE f_unaccent(?)', ['%' . $bairro . '%']);
```

## 5. Verificação

```sql
EXPLAIN ANALYZE
SELECT * FROM "scrapy-properties"
WHERE f_unaccent(bairro) ILIKE f_unaccent('%amizade%');
```

Antes: `Seq Scan`. Depois: `Bitmap Index Scan on idx_scrapy_props_bairro_trgm`.

## 6. Esforço

**1 hora**. Migration + alteração de 6 linhas no scope + `EXPLAIN ANALYZE` antes/depois.

## 7. Riscos

- **Tempo de criação do índice** em base grande: `CREATE INDEX CONCURRENTLY` se for rodar em produção com tráfego. Em dev, irrelevante.
- **Tamanho extra em disco**: ~20% do tamanho da coluna. Aceitável.

## 8. Não é Necessário

- Não precisamos de full-text search (`tsvector`) — `ILIKE` com trigram resolve nosso caso de "match parcial em nome de bairro". FTS entra no plano 06 via embeddings, com semântica de verdade.
