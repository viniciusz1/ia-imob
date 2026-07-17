# Market Insights

Explains the current composition of public real-estate listings without making
claims about demand, liquidity, appreciation, or ease of sale.

## Language

**Mapa de Oferta (Offer Map)**:
An authenticated view of current valid listings grouped by canonical
neighborhood for one city. It combines an interactive boundary map with an
equivalent list view.
_Avoid_: Demand map, sales heatmap, scarcity map

**Oferta Válida (Valid Offer)**:
A valid property page from the latest completed crawler run for each source,
deduplicated canonically within that source.
_Avoid_: Every crawled URL, agency inventory, demand sample

**Concentração Relativa de Oferta (Relative Offer Concentration)**:
The ratio between a property type's share within a neighborhood and its share
within the city under exactly the same filters. Ratios at or above 1.25 are
above the city pattern, ratios at or below 0.75 are below it, and intermediate
ratios are neutral. Classification requires at least ten valid neighborhood
listings and ten valid city listings of the selected type.
_Avoid_: Excess, scarcity, demand, sales velocity

**Cobertura Geográfica (Geographic Coverage)**:
The percentage of valid filtered listings whose canonical neighborhood matches
a feature in the city's configured versioned boundary file. Unmatched listings
remain part of city totals and are exposed for auditing.
_Avoid_: Data completeness, crawl success rate

**Qualidade da Amostra (Sample Quality)**:
An explicit indication of whether a neighborhood has the minimum ten valid
listings required for concentration classification. It does not certify the
commercial representativeness of the sample.
_Avoid_: Statistical certainty, market confidence

**Data-base (Data Date)**:
The latest completion timestamp among crawler runs that contributed listings to
the response. It is not the API request time.
_Avoid_: Request time, publication date

**Bairro Não Localizado no Mapa (Unmapped Neighborhood)**:
A crawled neighborhood whose listing remains valid but does not match a
configured geographic boundary. It remains visible in totals, coverage, and the
separate audit list.
_Avoid_: Invalid listing, discarded neighborhood

## Boundary files

Boundary data lives under
`ai-backendd-imobiliaria/resources/market-insights/geometries/` as immutable,
versioned GeoJSON. Each file records its source and license. Cities without a
configured file use the equivalent list view and expose the missing-geometry
state explicitly.
