---
status: accepted
---

# Store HTML evidence in Postgres

Evidencia HTML for onboarding attempts is stored in PostgreSQL rows linked to `agency_onboarding_attempts`, rather than in external file storage with database pointers. This keeps the proof set transactional with the attempt history and simpler to query from the Bancada de Refinamento de Extractors; moving large historical payloads to object storage remains an optimization if evidence volume becomes a database pressure point.
