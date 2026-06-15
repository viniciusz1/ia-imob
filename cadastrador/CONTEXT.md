# Cadastrador

Cadastrador turns an Imobiliaria URL and HTML evidence into database-backed extraction configuration for Imobscrapy. It includes onboarding flows and inspection flows for reviewing Extractors before persistence.

## Language

**Bancada de Inspecao**:
An offline review workflow that runs extractor synthesis against fixed HTML evidence without persisting an Agency, activating a Spider, or touching production data.
_Avoid_: Test runner, validator, crawler

**Bancada de Refinamento de Extractors**:
A post-onboarding review workflow where a user checks and corrects persisted Extractors against the HTML evidence that justified them.
_Avoid_: Selector editor, debug tool, reonboard

**Refinamento de Extractor**:
A user-confirmed correction to a persisted Extractor after onboarding, made while reviewing it against Evidencia HTML.
_Avoid_: Reonboard, tournament rerun, smoke validation

**Evidencia HTML**:
The captured property-page HTML used as evidence when judging and later refining Extractors. It is a historical snapshot from the full Amostra de Torneio, not only the subset shown to the LLM or a fresh fetch from the live site.
_Avoid_: Cache, fixture, screenshot, LLM prompt

**Evidencia Selecionada**:
The raw evidence matched by an Extractor before normalization, used to explain where a final extracted value came from.
_Avoid_: Final value, normalized value, rendered answer

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
One of the Extractors proposed for the same field during a Torneio, each derived from a distinct source strategy (DOM/XPath, structured data, or text) so it acts as an independent witness. Candidates sharing the same selector (differing only in pipeline) are one witness, not two.
_Avoid_: Variant, option, attempt, alternativa

**Presenca**:
Whether a field exists on a given page, established only by evidence independent of the candidate under judgment: an Ancora de Evidencia detected it, or two witnesses with distinct selectors agreed on a value. Pages with unknown Presenca leave both numerator and denominator when judging optional fields. A property of the site, not of any Extractor.
_Avoid_: Coverage, fill rate, pass rate

**Ancora de Evidencia**:
A value detected heuristically straight from the page (price, area, label-number pairs) used as a reinforced vote when judging a Torneio. It is the best proxy for truth available during live onboarding, where no ground truth exists.
_Avoid_: Ground truth, expected value, gabarito, oracle

**Acertividade**:
The fraction of an Amostra de Torneio's pages where an Extrator Candidato's final value matches the page truth (candidate consensus reinforced by the Ancora de Evidencia). It measures correctness, not mere fill.
_Avoid_: Pass rate, taxa de preenchimento, coverage, plausibility

**Amostra de Torneio**:
The set of pages (about 30% of the client's sitemap, with a floor and ceiling) the Extratores Candidatos are tested on during live onboarding. Distinct from a Pacote de Amostras, which is fixed and offline.
_Avoid_: Pacote de Amostras, synthesis sample, evidence

**Validacao de Fumaca**:
The end-to-end Spider run executed after an Agency is persisted, checking only that the integration works and produces items. It can confirm an Agency as active or downgrade it to saved_inactive; it never rejects. An inconclusive run (timeout, infrastructure failure) means "could not verify", not "failed".
_Avoid_: Quality gate, veto, validation verdict, prova de qualidade

**Rejeitada**:
The outcome reserved for positive evidence that extraction is wrong or impossible — the Torneio failed to produce verified mandatory Extractors. Never used for infrastructure failures or inconclusive checks.
_Avoid_: Timeout, erro, inconclusivo, falha de infra
