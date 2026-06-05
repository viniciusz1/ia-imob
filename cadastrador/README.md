# Cadastrador

FastAPI service for onboarding imobiliarias into the existing DB-driven scraper configuration.

Run from this directory:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

The service exposes these HTTP endpoints:

- `GET /health`
- `POST /agencies/onboard`
- `POST /agencies/{id}/reonboard`
- `GET /agencies/{id}/attempts/latest?agency_type=sitemap|wsm`
- `POST /debug/identity`
- `POST /debug/synthesize`

It writes to the existing tables consumed by the Scrapy spiders: `sitemap_agencies`,
`wsm_agencies`, `agency_field_extractors`, and `agency_onboarding_attempts`.

## Inspection bench

Run the Cadastrador inspection bench from this directory to review extractor synthesis
against stable HTML samples without persisting agencies, recording attempts, activating
Scrapy validation, or touching the database:

```bash
python -m app.inspection run millar:v1 --llm
```

The command writes a timestamped directory under `app/inspection/runs/` containing:

- `result.json`
- `report.html`
- `prompt-system.txt`
- `prompt-user.txt`

Sample packages live under `app/inspection/packages/<agency>/<version>/` with a
`manifest.json` and reviewable HTML files. Normal inspection runs create new run
directories and do not overwrite package versions.

Create a package with five HTML samples from a sitemap:

```bash
make create-inspection-package SITEMAP_URL=https://example.com/sitemap.xml
```

Optional overrides:

```bash
make create-inspection-package \
  SITEMAP_URL=https://example.com/sitemap.xml \
  INIT_URL=50 \
  CREATE_INSPECTION_PACKAGE=example:v1 \
  AGENCY="Example Imóveis" \
  FORCE=1
```

`INIT_URL` skips the first N URLs found in the sitemap and collects the next
five samples.
