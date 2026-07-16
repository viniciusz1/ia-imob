# Dispatch Crawler Operations through Postgres

Laravel and the Crawler Machine worker use the durable Crawler Operation records in Postgres as their initial cross-language dispatch mechanism. Laravel creates queued operations, while Python workers claim them atomically with a lease and maintain a heartbeat so abandoned work can be recovered. We chose this over Laravel's internal jobs table, whose payload is PHP-specific, and over a new Redis protocol because both runtimes already depend on Postgres and operational volume does not yet justify another messaging contract; the trade-off is bounded database polling.

Each worker publishes its identity, software version, capacity, health, and last heartbeat for control-plane observability. These records are informational and do not turn the Admin Area into a process manager. Atomic claims and leases make the same protocol usable by one initial worker or several concurrent workers.
