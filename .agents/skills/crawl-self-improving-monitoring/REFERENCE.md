# Referência de API — crawl-self-improving-monitoring

Rotas em `ai-backendd-imobiliaria/routes/api/admin.php`. Base: `{APP_URL}/api/admin/crawler` (local: `http://localhost/api/admin/crawler`). Todas exigem usuário **platform admin** com as permissões `crawler.*`.

## Autenticação

O login (`POST /api/login`) é por sessão (SPA). Para chamadas via `curl`, gere um token Sanctum para um platform admin:

```bash
cd ai-backendd-imobiliaria
./vendor/bin/sail artisan tinker --execute 'echo App\Models\User::where("email","<admin>")->first()->createToken("crawl-monitor")->plainTextToken;'
```

Use `-H "Authorization: Bearer $TOKEN" -H "Accept: application/json"`. Revogue o token ao terminar.

## Operações assíncronas

Discovery, geração de perfil, validação e produção retornam um `CrawlerOperation`. Faça polling de `GET /operations/{id}` até `state` ∈ `succeeded | failed | cancelled`. Campos úteis: `progress.{stage,percentage,processed,total,message}`, `result`, `error.{code,message}`, `timeline`, `discovery_snapshot_id`.

Para esperar sem encerrar o turno, use o script da skill (requer `curl` e `jq`):

```bash
export API_BASE=http://localhost/api/admin/crawler TOKEN=<token>
<dir-da-skill>/scripts/wait-operation.sh <operation_id> [intervalo_s=30] [timeout_s=7200]
# exit 0 = succeeded · 1 = failed/cancelled · 2 = timeout · 3 = erro HTTP/uso
```

| Ação | Endpoint |
| :-- | :-- |
| Detalhe da operação | `GET /operations/{id}` |
| Listar operações | `GET /operations` |
| Fila | `GET /operation-queue` |
| Retentar | `POST /operations/{id}/retry` |
| Cancelar | `POST /operations/{id}/cancel` |

## Imobiliária

| Ação | Endpoint | Notas |
| :-- | :-- | :-- |
| Listar | `GET /crawl-agencies` | |
| Detalhe | `GET /crawl-agencies/{id}` | `base_url`, `lifecycle_state`, `revalidation_required`, `current_published_crawl_run_id` |
| Ativar | `POST /crawl-agencies/{id}/activate` | Produção exige `lifecycle_state=active` e `revalidation_required=false` |
| Arquivar | `PATCH /crawl-agencies/{id}/lifecycle` | `{"lifecycle_state":"archived"}` |
| Onboarding (contexto) | `GET /crawl-agencies/{id}/onboarding-plan`, `GET /crawl-agencies/{id}/onboarding-executions` | |

## Discovery

| Ação | Endpoint |
| :-- | :-- |
| Rodar discovery | `POST /operations` |
| Snapshots da agência | `GET /crawl-agencies/{id}/discovery-snapshots` → `id`, `url_count`, `operation_id` |
| URLs do snapshot | `GET /discovery-snapshots/{id}/urls?page=1&per_page=100` (`per_page` ∈ 20, 30, 100) |

```json
POST /operations
{
  "type": "discovery",
  "crawl_agency_id": 123,
  "discovery_policy": { "sources": ["playwright"], "max_urls": 10000 }
}
```

`sources` aceitos: `sitemap`, `playwright`, `cc`, `wayback`, `crt`, `probe`, `robots`, `feed`, `homepage`. Use `["sitemap"]` ou `["playwright"]` — são os mais assertivos.

Checar sitemap: `curl -sIL {base_url}/sitemap.xml` (e `robots.txt` → linha `Sitemap:`).

## Perfil de extração

| Ação | Endpoint | Body |
| :-- | :-- | :-- |
| Contrato de dados ativo | `GET /market-data-contracts` | use a versão ativa como `market_data_contract_version_id` |
| Sugerir imóvel-amostra | `POST /crawl-agencies/{id}/sample-url-suggestion` | |
| Gerar perfil | `POST /extraction-profiles/generate` | ver abaixo |
| Perfis da agência | `GET /crawl-agencies/{id}/extraction-profiles` | `status`, `sample_url`, `schemas`, `fields`, `strategies`, `parameters`, `latest_validation_report` |
| Rodar validação | `POST /extraction-profiles/{id}/validation` | `{}` (ou `{"link_to_onboarding":true}` dentro do onboarding) |
| Relatório | `GET /profile-validation-reports/{reportId}` | `valid_ratio`, `valid_record_count`/`sampled_url_count`, `required_field_coverage`, `blocking_failures`, `warnings`, `eligible` |
| Registros da validação | `GET /crawl-agencies/{a}/extraction-profiles/{p}/profile-validation-reports/{r}/records?filter=issues&per_page=20` | |
| Aprovar/rejeitar | `POST /extraction-profiles/{id}/decision` | `{"decision":"approved","reason":"valid_ratio 0.82 ..."}` |
| Ativar | `POST /extraction-profiles/{id}/activate` | após aprovado |

```json
POST /extraction-profiles/generate
{
  "crawl_agency_id": 123,
  "discovery_snapshot_id": 456,
  "market_data_contract_version_id": 7,
  "sample_url": "https://imobiliaria.com.br/imovel/apartamento-3-quartos-centro-1234",
  "sample_url_confirmed": true
}
```

Assertividade = `valid_ratio` (0–1). A UI recomenda ≥ 0,80 de válidos e ≥ 0,90 de cobertura por campo obrigatório; o corte desta skill é 0,70.

### Edição manual de perfil

Não há endpoint de edição. Edite via tinker **apenas um perfil que ainda não está `active`**, ajustando `schemas`, `fields`, `strategies` ou `parameters` (colunas JSON de `App\Models\Crawler\ExtractionProfile`), e rode a validação de novo:

```bash
./vendor/bin/sail artisan tinker
>>> $p = App\Models\Crawler\ExtractionProfile::find(789);
>>> $s = $p->schemas;  // inspecione, corrija o seletor/campo que falha
>>> $p->schemas = $s; $p->save();
```

Antes de editar, compare os registros com problema com o HTML real da página para achar o seletor certo. Registre a mudança feita no relatório final.

## Produção

| Ação | Endpoint |
| :-- | :-- |
| Rodar produção | `POST /production-crawls` |
| Runs da agência | `GET /crawl-agencies/{id}/crawl-runs` |
| Detalhe do run | `GET /crawl-runs/{id}` → `counts.{raw,normalized,rejected,errors}`, `technical_state`, `publication_state`, `quality_report`, `error_summary` |
| Registros do run | `GET /crawl-runs/{id}/records` |
| Lotes/diagnóstico | `GET /production-crawl-batches/{id}`, `.../items`, `.../diagnostics` |

```json
POST /production-crawls
{
  "crawl_agency_id": 123,
  "discovery_mode": "existing",
  "discovery_snapshot_id": 456,
  "extraction_profile_id": 789
}
```

`discovery_mode: "fresh"` refaz o discovery com a política ativa da agência. Conferência cruzada dos importados: `GET /api/market-properties?imobiliaria=<nome da agência>` (exige usuário com agência).
