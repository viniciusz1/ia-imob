# Keep Crawler Machine secrets outside the control plane

Crawler Machine API keys and infrastructure credentials remain in the deployment environment or a dedicated secret manager rather than in application tables, operation plans, logs, snapshots, or API responses. The Platform Admin interface may expose integration availability, sanitized failures, partial credential identification, and connection tests, but it cannot read secret values. This limits fully interface-driven configuration, but prevents the crawler control plane and its operational artifacts from becoming a secret store.
