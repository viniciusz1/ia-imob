---
status: accepted
---

# Refinement preview runs in Cadastrador

The Bancada de Refinamento de Extractors previews values and highlights Evidencia Selecionada through the Cadastrador service, while Laravel remains responsible for authentication, permissions, and persisted Extractor CRUD. This keeps preview behavior aligned with Imobscrapy's XPath/CSS/JSON-LD/OG/literal execution and DSL Pipeline instead of reimplementing the scraper extraction semantics in PHP.
