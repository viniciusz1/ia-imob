# Cadastrador

Cadastrador turns an Imobiliaria URL and HTML evidence into database-backed extraction configuration for Imobscrapy. It includes onboarding flows and inspection flows for reviewing Extractors before persistence.

## Language

**Bancada de Inspecao**:
An offline review workflow that runs extractor synthesis against fixed HTML evidence without persisting an Agency, activating a Spider, or touching production data.
_Avoid_: Test runner, validator, crawler

**Pacote de Amostras**:
A stable group of HTML examples used by the Bancada de Inspecao to judge extractor synthesis for one Imobiliaria slice. A general package validates mandatory Imovel fields, while scenario packages validate Optional Property Fields.
_Avoid_: Random examples, scrape result, fixture dump

**Pacote por Cenario**:
A Pacote de Amostras scoped to a homogeneous scenario, such as apartments for rent, commercial rentals, or land rentals. It exists so Optional Property Fields are judged only where those fields make sense.
_Avoid_: Mixed package, broad sample, random sample

**Torneio de Extratores**:
The selection process where several Extratores Candidatos for one field compete against an Amostra de Torneio and the one with the highest Acertividade is kept.
_Avoid_: Competition, disputa, A/B test, beauty contest

**Extrator Candidato**:
One of the Extractors proposed for the same field during a Torneio, each derived from a distinct source strategy (DOM/XPath, structured data, or text) so it acts as an independent witness.
_Avoid_: Variant, option, attempt, alternativa

**Ancora de Evidencia**:
A value detected heuristically straight from the page (price, area, label-number pairs) used as a reinforced vote when judging a Torneio. It is the best proxy for truth available during live onboarding, where no ground truth exists.
_Avoid_: Ground truth, expected value, gabarito, oracle

**Acertividade**:
The fraction of an Amostra de Torneio's pages where an Extrator Candidato's final value matches the page truth (candidate consensus reinforced by the Ancora de Evidencia). It measures correctness, not mere fill.
_Avoid_: Pass rate, taxa de preenchimento, coverage, plausibility

**Amostra de Torneio**:
The set of pages (about 30% of the client's sitemap, with a floor and ceiling) the Extratores Candidatos are tested on during live onboarding. Distinct from a Pacote de Amostras, which is fixed and offline.
_Avoid_: Pacote de Amostras, synthesis sample, evidence
