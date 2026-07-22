# Publish only quality-approved market snapshots

A technically completed production crawl produces a Candidate Snapshot; it does not immediately become the market data consumed by AI Searcher and Property Valuation. The Quality Gate either promotes it atomically to the Crawl Agency's Published Snapshot or quarantines it while the previous Published Snapshot remains available. This supersedes ADR 0007's `completed + latest` publication rule and deliberately favors continuity and data quality over unconditional freshness when extraction regresses or produces no usable properties.

A Platform Admin may exceptionally publish a quarantined production snapshot only after reviewing its evidence and recording a justification. The decision itself preserves the responsible admin and timestamp without requiring a general audit subsystem. Blocking onboarding failures cannot be overridden, and snapshots are immutable rather than manually corrected in place.

The global Quality Policy is managed through the initial Platform Admin interface and follows `draft -> validating -> active`. Active versions are immutable and cannot be deleted; every quality evaluation pins the version it used, so activating a newer policy never changes historical verdicts.

Activating an incompatible Market Data Contract cannot replace a Crawl Agency's last Published Snapshot with a result produced under the previous contract. Existing published data remains available while affected agencies are revalidated; old-contract operations may retain their technical results but cannot publish after the incompatible activation.
