---
status: accepted
---

# Onboarding accuracy via consensus + anchor tournament

At live onboarding there is no ground truth for a new Imobiliaria's pages, so the
pipeline's only signal was `pass_rate` (did a selector return a *plausible* non-empty
value), which cannot tell a correct extractor from a confidently-wrong one (e.g. the
condominium fee instead of the sale price). To raise **Acertividade** we run, per field,
a **Torneio de Extratores**: three independent **Extratores Candidatos** are generated
from distinct source strategies (DOM/XPath, structured og/jsonld, text/regex) and scored
on an **Amostra de Torneio** (~30% of the client's sitemap, clamped to [20, 60], strided,
fetched with bounded-concurrency polite fetch). A page's truth is the **consensus** of the
candidates reinforced by a heuristically-detected **Âncora de Evidência** (price/area/
feature values; for `link_imovel` the anchor is the known page URL). The highest-acertividade
candidate wins at priority 1; losing candidates that *agreed* with the winner become its
fallback chain. A mandatory field is accepted only if the winner's acertividade ≥ ~0.8 and
chain coverage ≥ 0.9, retried up to 3 rounds (feeding `prior_failures`), else the agency is
rejected.

## Considered Options

- **Compare to ground truth** — impossible at onboarding; expected values only exist for
  DB-backed Pacotes de Amostras on the offline Bancada de Inspeção, never for a new site.
- **Keep judging by `pass_rate` alone** — cheapest, but rewards plausible-but-wrong
  selectors, which is the exact failure this change targets.

## Consequences

- ~3× generation token cost and longer onboarding (more LLM rounds + fetching up to 60
  pages). Accepted deliberately: trading tokens and time for correctness.
- Diverse calls may abstain per field, so a field can have 1–3 candidates. Single-candidate
  fields are judged by anchor + coverage only, with no consensus vote.
- Scoped to the `sitemap` execution model. `wsm` sites (no property sitemap; the sample is
  just the homepage) keep the current single-pass flow — revisit if WSM volume grows.
- The strict two-axis gate applies only to mandatory fields. Anchored numerics and
  best-effort fields keep their winner on coverage alone, with acertividade as a tiebreaker
  only, because their consensus signal is too weak to reject on.
