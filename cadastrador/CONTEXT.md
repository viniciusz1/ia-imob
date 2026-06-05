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
