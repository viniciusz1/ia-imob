# Plano Técnico 02: Cache de Parses do LLM (Redis)

## 1. Motivação

Cada busca paga uma chamada DeepSeek (1–3s + custo por token). Prompts curtos como `"ap 2 quartos centro"`, `"casa com piscina"`, `"3 quartos amizade"` repetem **muito** — pesquisas de usuários distintos resultam no mesmo JSON.

Cacheando `(prompt normalizado + context_city + versão_do_schema) → filtros`, eliminamos o LLM do caminho crítico para a maioria das buscas reais.

## 2. Estratégia

### 2.1 Chave do cache

```php
$key = 'ai:parse:' . hash('sha256', json_encode([
    'prompt' => Str::of($prompt)->lower()->squish()->ascii()->toString(),
    'city'   => $contextCity,
    'schema' => self::SCHEMA_VERSION, // bump quando o schema mudar
]));
```

- Normalização do prompt (`lower + squish + ascii`) maximiza hit rate sem perder semântica.
- `SCHEMA_VERSION` invalida tudo automaticamente quando alteramos o contrato.

### 2.2 TTL e store

- TTL: **7 dias** (suficiente — base de imóveis muda, mas o *mapeamento prompt→filtros* não).
- Store: `Redis` (já temos no stack do Laravel; queue/sessions costumam usar).

### 2.3 Wrap em `parsePrompt`

```php
public function parsePrompt(string $prompt, ?string $contextCity = null): array
{
    $key = $this->cacheKey($prompt, $contextCity);

    return Cache::store('redis')->remember($key, now()->addDays(7),
        fn () => $this->parsePromptUncached($prompt, $contextCity)
    );
}
```

`parsePromptUncached` é o método atual renomeado.

### 2.4 Cache **negativo** opcional

Quando `parsePromptUncached` lança `RuntimeException` por timeout/erro do provider, cachear o erro por TTL curto (60s) para evitar avalanche de chamadas em incidente do DeepSeek. Pode ficar fora da v1.

## 3. Métricas

Logar `cache_hit: true|false` no contexto da request. Expor em `meta.cache_hit` na resposta da API (útil pra debug) **ou** apenas em métricas Prometheus.

Hit rate esperado em produção: ~50–70% após uma semana de aquecimento.

## 4. Invalidação

- **Schema changes** → bump `SCHEMA_VERSION`.
- **Catálogo de proximidade muda** (enquanto o plano 05 não está pronto) → bump `SCHEMA_VERSION` também, pois o conteúdo do system prompt mudou.
- **Por usuário**: não há — o parse é determinístico, não personalizado.

## 5. Plano de Testes

- Unit: dois `parsePrompt` consecutivos com mesmo prompt → segundo não chama `LlmProvider` (mock conta invocações).
- Unit: prompts diferenciados apenas por caixa/acento batem no mesmo cache key.
- Unit: bump de `SCHEMA_VERSION` invalida.

## 6. Esforço

**0,5 dia**. Sem migration, sem mudança no frontend.

## 7. Riscos

- **Cache poisoning** se o LLM retornar lixo: o `normalizeFilters` ainda roda na escrita; lixo persistente seria invalidado no próximo bump de schema. Risco baixo.
- **Memória do Redis**: hash SHA256 + JSON pequeno (~1KB) × 10k chaves = ~10MB. Desprezível.
