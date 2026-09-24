# Property Valuation

Estimates the market value of a property from its characteristics and comparable market properties.

**Avaliar Imóvel** and **Consultar Avaliações** are CRM Permissions and a **Avaliação Salva** is an Agency-Owned Record; both concepts are defined in [Access Control](../access-control/CONTEXT.md). A saved valuation is readable only within the Agency that created it.

## Language

**Avaliação de Mercado (Market Valuation)**:
The system's estimate of a property's likely market value based on the characteristics provided by the user and comparable market properties.
_Avoid_: Price validation, asking price check

**Avaliação Salva (Saved Valuation)**:
A valuation attempt owned by the agency and preserved as an immutable historical record so its inputs, comparable properties, adjustments, author, and outcome remain explainable after market data changes.
_Avoid_: Temporary calculation, current search result

**Código de Avaliação (Valuation Code)**:
A human-readable identifier used to reference a saved valuation in the system and in its market valuation report.
_Avoid_: Database ID, protocol number

**Imóvel Avaliado (Subject Property)**:
The property being evaluated from user-provided characteristics.
_Avoid_: Listing, scraped property, market property

**Imóvel Comparável (Comparable Property)**:
A market property similar enough to the subject property to support the valuation.
_Avoid_: Example property, search result, reference item

**Candidato Comparável (Comparable Candidate)**:
A comparable property surfaced for human review before the valuation sample is finalized.
_Avoid_: Similar property, final sample item

**Evidência Comparável (Comparable Evidence)**:
A preserved snapshot of a comparable property as it was reviewed for a saved valuation, including whether it was approved for or rejected from the valuation sample.
_Avoid_: Live market property reference, property ID only

**Comparável Válido (Valid Comparable)**:
A comparable property whose price, area, and main characteristics are complete and plausible enough to participate in the valuation.
_Avoid_: Raw comparable, unfiltered sample

**Revisão de Comparável (Comparable Review)**:
The user's decision to leave a comparable candidate pending, approve it for the valuation sample, or reject it from the valuation sample.
_Avoid_: Automatic validation, data quality check

**Comparável Pendente (Pending Comparable)**:
A comparable candidate that has not yet received a user's review decision.
_Avoid_: Invalid comparable, unprocessed data

**Comparável Aprovado (Approved Comparable)**:
A comparable candidate accepted by the user for the valuation sample, regardless of how many other comparable candidates are approved.
_Avoid_: Automatically valid comparable, selected row

**Comparável Rejeitado (Rejected Comparable)**:
A comparable candidate rejected by the user from the valuation sample.
_Avoid_: Bad listing, deleted comparable

**Revisão Completa de Comparáveis (Complete Comparable Review)**:
A comparable review state where every comparable candidate has been either approved or rejected, leaving no pending candidates.
_Avoid_: Partially reviewed sample, calculation-ready flag

**Comparabilidade (Comparability)**:
The degree to which a comparable property matches the subject property's market-defining characteristics. In the first version, comparable properties must be in the same normalized neighborhood and city; bedrooms and garage spaces are strict matches, while bathrooms start as an exact match and may be relaxed when the sample is insufficient.
_Avoid_: Similarity, search match

**Amostra Insuficiente (Insufficient Sample)**:
The valuation outcome when there are not enough comparable properties to support a market valuation.
_Avoid_: Error, empty result

**Amostra de Avaliação (Valuation Sample)**:
The final set of approved comparable properties used to calculate a market valuation; it must contain at least one approved comparable.
_Avoid_: Initial search results, raw dataset

**Valor por Metro Quadrado (Price per Square Meter)**:
The comparable property's price divided by its area, used as the primary basis for estimating the subject property's market value.
_Avoid_: Flat average price, fixed price

**Área do Comparável (Comparable Area)**:
The area recorded for a comparable market property and used as the measurement basis for price-per-square-meter calculations.
_Avoid_: Declared usable area, external area source

**Faixa de Mercado (Market Range)**:
The valuation result expressed as a range around the central market estimate rather than as a single exact price.
_Avoid_: Exact value, final price

**Relatório de Avaliação de Mercado (Market Valuation Report)**:
A downloadable document that presents the market valuation, the subject property characteristics, the comparable properties, and any valuation adjustments, without claiming to be a technical or legal appraisal.
_Avoid_: Technical appraisal, legal appraisal, receipt, export

**Avaliar Imóvel (Create Valuation)**:
The permissioned capability to create a new market valuation for a subject property.
_Avoid_: View valuation, manage valuation

**Consultar Avaliações (View Valuations)**:
The permissioned capability to view saved valuations and download their market valuation reports.
_Avoid_: Create valuation, public report access

**Risco de Enchente (Flood Risk)**:
A declared characteristic of the subject property that reduces the full market range after comparable properties establish the base market range.
_Avoid_: Comparable filter, scraped flood evidence

**Venda Residencial Urbana (Urban Residential Sale)**:
Valuations of houses, apartments, and townhouses offered for sale in urban neighborhoods.
_Avoid_: Land valuation, commercial valuation, rural valuation

**Tipo Residencial (Residential Type)**:
The controlled subject-property type used for valuation, limited to house, apartment, and townhouse in the first version.
_Avoid_: Raw scraped type, free-text property type


**Finalidade da Avaliação (Valuation Purpose)**:
The transaction being estimated: `sale` (sale price) or `rent` (monthly rent). It is an immutable input of every Saved Valuation. Historical valuations and API requests that omit this input remain `sale`.

**Locação Residencial Urbana (Urban Residential Rental)**:
Valuations of monthly rent for houses, apartments, and townhouses in urban neighborhoods. Seasonal and daily rentals are outside this scope.

## Sale and rental price contract

- `property_valuations.purpose` stores `sale` or `rent`; range columns retain their existing names. Rental ranges are BRL per month.
- `crawler.market_properties.valor` retains its sale-price meaning. The nullable decimal `valor_aluguel` stores monthly rent in BRL, excluding condominium fees, property tax and other charges. A listing offered for both transactions may populate both fields; a rent-only listing must leave `valor` null.
- Ingestion must populate `valor_aluguel` from an explicit monthly rental price. Do not infer it from sale prices or copy ambiguous legacy `valor` values. Existing market records keep `valor_aluguel = null` until ingestion supplies rental data.
- Rental comparisons require a finite, strictly positive `valor_aluguel`; sale comparisons keep the existing R$ 50,000 to R$ 100,000,000 validation. Both retain the area and characteristic validations. There is no sale-price fallback for rent, or rental-price fallback for sale.
- Both purposes use price divided by area, then p25/median/p75 multiplied by the subject area. Existing sample selection, manual review and declared flood-risk adjustment apply to both purposes.
- Comparable Evidence preserves `purpose`, the selected `price`, and `price_per_square_meter`. Evidence saved before this extension is sale evidence. Rental amounts display cents and a monthly unit in the UI and reports.

## Deployment

Run `php artisan migrate` in the backend to add the purpose and monthly-rent columns. Deploy the backend before the updated frontend. The crawler implementation is not included in this checkout; its ingestion must adopt the price contract above before rental valuations have a usable sample. Missing rental prices produce Insufficient Sample rather than an estimate derived from sales.
