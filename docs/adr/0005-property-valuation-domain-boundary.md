# Property valuation has a dedicated domain boundary

The property valuation module will be implemented as a dedicated backend domain boundary instead of placing the valuation rules in controllers, Eloquent models, or generic services. We chose a pragmatic DDD shape because market valuation combines comparable selection, data quality rules, flood-risk adjustment, saved historical results, and report generation; keeping those rules behind a valuation use case makes the calculation testable and prevents it from being coupled to the existing CRUD and AI search flows.
