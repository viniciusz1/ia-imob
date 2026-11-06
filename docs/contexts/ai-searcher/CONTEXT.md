# AI Searcher

Agency-facing search over the platform's market-wide property inventory. It offers natural-language and conventional-filter modes over the same protected data source.

## Language

**AI Searcher**:
The Agency workspace in which Agency Users search the market-wide property inventory, whether through a natural-language prompt or conventional filters. Platform Admins do not use this Agency-scoped workspace.
_Avoid_: AI-only search, Agency inventory search, public property search

**Market Search**:
A successfully delivered page of at most 48 market-property results in the AI Searcher, through either natural-language mode or conventional-filter mode, including a valid page with no matches. Pagination, reordering, and filter changes each produce another Market Search; invalid, failed, and allowance-rejected requests do not.
_Avoid_: AI request, prompt search, filter-only search

**Search Week**:
The calendar usage period from Monday at 00:00 through the following Monday at 00:00 in `America/Sao_Paulo`, when an Agency's Market Search allowance renews.
_Avoid_: Rolling seven days, UTC week, billing cycle

**Weekly Search Allowance**:
The Agency-level maximum number of Market Searches that may be delivered during one Search Week. It defaults to 100 for every Agency and a Platform Admin may configure it individually; changing it during a Search Week changes only the remaining balance and never resets consumption. Zero disables Market Search for the Agency, and the allowance is never unlimited.
_Avoid_: Per-user limit, AI token limit, global request limit

**Exhausted Search Allowance**:
The Agency state in which its users have collectively consumed the Weekly Search Allowance for the current Search Week. Further Market Searches are rejected until renewal or a sufficient allowance increase, while already delivered results remain available.
_Avoid_: User suspension, Agency deactivation, subscription cancellation

**Daily User Search Allowance**:
The maximum Market Searches an Agency User may deliver in a calendar day in `America/Sao_Paulo`. It defaults to 20, can be changed by a Platform Admin, and applies alongside the Weekly Search Allowance. Zero disables the user's searches.

**Market Search History**:
The record of each successfully delivered Market Search, including its Agency User, Agency, time, mode and submitted prompt or filters. Platform Admins with the appropriate Permission can inspect it.

## Relationships

**Market Search Access Policy**:
The Agency-level allowlists of property cities and Crawl Agencies that its users can search. Each list is independently unrestricted by default. When both are configured, a property must satisfy both. Platform Admins manage the policy; both search modes and their filter options enforce it, including approximate searches. Other consumers of market inventory are unaffected.

- An **Agency** has one shared **Weekly Search Allowance** for all of its Agency Users.
- A **Platform Admin** has no Agency and cannot perform a **Market Search** through the AI Searcher.
