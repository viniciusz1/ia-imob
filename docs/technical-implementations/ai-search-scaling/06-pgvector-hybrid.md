# Plano Técnico 06: Embeddings + pgvector (Busca Híbrida)

## 1. Motivação

O pipeline atual só captura critérios **estruturados** ("3 quartos", "até 500 mil", "no Amizade"). Termos subjetivos ficam de fora:

- "Apartamento aconchegante com vista pro rio"
- "Casa com cara de chácara"
- "Imóvel pra investimento" (próximo a universidades, baixo ticket, alta liquidez)
- "Casa pra família grande" (4+ quartos, área de lazer, bairro residencial)

Esses prompts contêm sinal semântico **na descrição do imóvel** — que hoje só é acessada via `ILIKE '%palavra%'` (substring exata).

**Busca híbrida** = filtros estruturados (LLM extrai o que é objetivo) ∩ ranqueamento por similaridade semântica (embedding do prompt vs embedding da descrição).

## 2. Pré-requisitos

- Estabilidade dos planos 01, 02, 03 (recomendado).
- Postgres com `pgvector` (`CREATE EXTENSION vector`).

## 3. Schema

```php
DB::statement('CREATE EXTENSION IF NOT EXISTS vector;');

Schema::table('scrapy-properties', function (Blueprint $table) {
    $table->timestamp('embedded_at')->nullable();
    $table->string('embedding_model', 64)->nullable(); // versionamento
});

DB::statement('ALTER TABLE "scrapy-properties" ADD COLUMN embedding vector(1536);');

DB::statement('CREATE INDEX idx_scrapy_props_embedding
    ON "scrapy-properties"
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);');
```

Dimensão 1536 = `text-embedding-3-small` (OpenAI). Trocar para `768` se usar `gemini-embedding`, etc. — versionar via coluna `embedding_model`.

## 4. Geração de Embeddings

### 4.1 Texto canônico

```php
public function embeddingInput(): string
{
    return collect([
        $this->tipo,
        $this->bairro . ', ' . $this->cidade,
        $this->descricao,
        $this->amenitiesAsText(),  // "Possui: piscina, churrasqueira, sacada."
        "Quartos: {$this->quartos}. Suítes: {$this->suites}. Vagas: {$this->vagas}.",
    ])->filter()->implode("\n");
}
```

### 4.2 Job

```php
class GenerateEmbeddingJob implements ShouldQueue
{
    public function handle(EmbeddingProvider $provider): void
    {
        $property = ScrapyProperty::find($this->propertyId);
        $vector = $provider->embed($property->embeddingInput());

        $property->forceFill([
            'embedding' => DB::raw("'" . self::formatVector($vector) . "'::vector"),
            'embedded_at' => now(),
            'embedding_model' => $provider->modelId(),
        ])->save();
    }
}
```

### 4.3 Disparo

- Quando o scraper cria/atualiza um imóvel → despacha job.
- Backfill inicial: `php artisan properties:embed --all --batch=200`.

### 4.4 Custo

`text-embedding-3-small`: **$0.02 / 1M tokens**. Imóvel médio ≈ 300 tokens → $0.006 / 1000 imóveis. 10k imóveis = $0.06. Desprezível.

## 5. Busca Híbrida

### 5.1 Fluxo

```
prompt do usuário
    │
    ├──► LLM (plano 01) ──► filtros estruturados (cidade, quartos, min/max, near…)
    │
    └──► EmbeddingProvider ──► vetor do prompt
                 │
                 ▼
    SQL: WHERE (filtros estruturados)
         ORDER BY embedding <=> :prompt_vector
         LIMIT 50
```

### 5.2 Query

```sql
WITH candidates AS (
    SELECT *, (embedding <=> :prompt_vec) AS distance
    FROM "scrapy-properties"
    WHERE -- filtros estruturados aqui
      AND embedding IS NOT NULL
    ORDER BY embedding <=> :prompt_vec
    LIMIT 200
)
SELECT * FROM candidates
ORDER BY distance
LIMIT :per_page
OFFSET :offset;
```

> Operador `<=>` = cosine distance no pgvector.

### 5.3 Quando usar embedding vs sort tradicional

- Se o usuário pediu sort explícito (`price_asc`, `area_desc`, etc.) → usar sort tradicional, sem embedding ranking.
- Se o usuário **não** pediu sort → ranquear por similaridade semântica (default).
- Manter o `relaxed[]` na meta resposta para o frontend explicar.

### 5.4 Mudanças em `AiPropertySearchService`

```php
public function search(array $filters, int $perPage, ?string $sort, int $page,
                       ?string $rawPrompt = null): array
{
    if ($sort === null && $rawPrompt && config('ai.hybrid_search')) {
        $vector = $this->embedder->embed($rawPrompt);
        return $this->searchHybrid($filters, $vector, $perPage, $page);
    }
    // ... caminho atual
}
```

Controller passa o `rawPrompt` adiante.

## 6. Plano de Testes

- Unit: `EmbeddingProvider` mockado, `GenerateEmbeddingJob` popula a coluna corretamente.
- Integration: 50 imóveis indexados; busca por "apartamento aconchegante" retorna imóveis cuja descrição contém vocabulário relacionado (cozy, charmoso, intimista) mesmo sem a palavra exata.
- Comparação A/B: medir CTR e tempo até clique entre busca atual vs híbrida em prompts subjetivos.

## 7. Rollout

1. Flag `AI_HYBRID_SEARCH=false` por default.
2. Backfill em background.
3. Ativar para 10% do tráfego (shadow), medir.
4. Ativar gradualmente.

## 8. Esforço

**1 semana:**
- Migration + extensão: 0,5 dia
- EmbeddingProvider + job + backfill: 1,5 dia
- Query híbrida + integração no service: 2 dias
- Testes + métricas: 1 dia
- A/B + rollout: 1 dia

## 9. Riscos

- **Custo de embedding do prompt em runtime**. Mitigação: cache do embedding do prompt (mesmo padrão do plano 02 — chave `ai:embed:` + hash do prompt).
- **HNSW vs IVFFlat**: HNSW é mais rápido em query, mais lento em insert. Para nossa escala (insert via scraper, query frequente) é o trade-off correto.
- **Re-embedding ao mudar de modelo**: coluna `embedding_model` permite rodar dois modelos em paralelo e migrar gradualmente.
- **Modelo pode ranquear bem coisas que não fazem sentido humano** (ex: descrição rica de imóvel ruim ranqueia alto). Mitigação: limite `LIMIT 200` no top-K + filtros estruturados duros antes.

## 10. Não Faz Parte deste Plano

- **Re-ranking com LLM** (depois do top-K vetorial, passar os 20 melhores por um LLM pra reordenar). Pode entrar em fase futura se a qualidade não bater — mas é caro e raramente vale a pena.
- **RAG conversacional** (chat continuado sobre os imóveis). Outro escopo.
