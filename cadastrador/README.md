# Cadastrador

FastAPI service for onboarding imobiliarias into the existing DB-driven scraper configuration.

Run from this directory:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

The service keeps the same HTTP contract as the previous `imobscrapy/cadastrador` app:

- `GET /health`
- `POST /agencies/onboard`
- `POST /agencies/{id}/reonboard`
- `GET /agencies/{id}/attempts/latest?agency_type=sitemap|wsm`
- `POST /debug/identity`
- `POST /debug/synthesize`

It writes to the existing tables consumed by the Scrapy spiders: `sitemap_agencies`,
`wsm_agencies`, `agency_field_extractors`, and `agency_onboarding_attempts`.

